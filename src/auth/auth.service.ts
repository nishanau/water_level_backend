import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { SuppliersService } from 'src/suppliers/suppliers.service';
import * as bcrypt from 'bcrypt';
import { UserResponse } from './types/auth.types';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginResponse, SupplierResponse } from './types/auth.types';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Tank } from '../models/tank.schema';
import { Order } from '../models/order.schema';
import { Notification } from '../models/notification.schema';
import { PaymentMethod } from '../models/payment-method.schema';
import { Types } from 'mongoose';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private supplierService: SuppliersService,
    @InjectModel(Tank.name) private tankModel: Model<Tank>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>,
    @InjectModel(PaymentMethod.name)
    private paymentMethodModel: Model<PaymentMethod>,
  ) {}

  private invalidatedTokens: Set<string> = new Set();

  async validateUser(
    email: string,
    password: string,
  ): Promise<UserResponse | SupplierResponse | null> {
    const user = await this.usersService.findByEmail(email.trim());

    if (!user) {
      const supplier = await this.supplierService.findByEmail(email.trim());

      if (supplier) {
        const isPasswordValid = await bcrypt.compare(
          password,
          supplier.password,
        );
        if (!isPasswordValid) {
          return null;
        }

        const userObject = supplier.toJSON ? supplier.toJSON() : supplier;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _pass, ...result } =
          userObject as SupplierResponse & {
            password: string;
          };
        return result;
      } else {
        console.error(`User with email ${email} not found`);
        throw new NotFoundException('User not found');
      }
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    const userObject = user.toJSON ? user.toJSON() : user;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pass, ...result } = userObject as UserResponse & {
      password: string;
    };
    return result;
  }

  async login(user: UserResponse | SupplierResponse): Promise<LoginResponse> {
    const payload = {
      email: user.email,
      sub: user._id,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(
        { ...payload, tokenType: 'refresh' },
        { expiresIn: '7d' },
      ),
    ]);

    if (user.role === 'customer') {
      // Fetch related data for the customer
      const tanks = await this.tankModel
        .find({ userId: user._id })
        .select('_id');
      const orders = await this.orderModel
        .find({ userId: user._id })
        .select('_id');
      const paymentMethods = await this.paymentMethodModel
        .find({ userId: user._id })
        .select('_id');

      return {
        user: {
          ...user,
          tankIds: tanks.map((tank) => tank._id),
          orderIds: orders.map((order) => order._id),
          paymentMethodIds: paymentMethods.map((method) => method._id),
        },
        access_token: accessToken,
        refresh_token: refreshToken,
      };
    } else {
      // For suppliers, we can return the user directly
      return {
        user,
        access_token: accessToken,
        refresh_token: refreshToken,
      };
    }
  }

  async getProfile(
    userId: string,
    email: string,
  ): Promise<UserResponse | SupplierResponse> {
    // Try to find user in users collection
    const user = await this.usersService.findById(userId);
    if (user) {
      return user;
    }
    // If not found, try supplier
    const supplier = await this.supplierService.findByEmail(email);
    if (supplier) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...supplierWithoutPassword } = supplier;
      return {
        ...supplierWithoutPassword,
        _id: (supplier._id as Types.ObjectId).toString(), // Ensure _id is a string
      };
    }
    throw new NotFoundException('User not found');
  }

  async verifyToken(token: string): Promise<any> {
    try {
      return await this.jwtService.verifyAsync(token);
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired token', err.message);
    }
  }

  async register(userData: CreateUserDto): Promise<UserResponse> {
    // Hash the password

    if (
      !userData.password ||
      userData.password.trim() === '' ||
      !userData.email ||
      !userData.firstName ||
      !userData.lastName ||
      !userData.role ||
      userData.password.trim().length === 0
    ) {
      throw new BadRequestException('All fields are required');
    }
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    // Create a new user
    const existingUser = await this.usersService.findByEmail(userData.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const createdUser = await this.usersService.create({
      ...userData,
      password: hashedPassword,
    });

    const userObject = createdUser.toJSON ? createdUser.toJSON() : createdUser;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pass, ...result } = userObject as UserResponse & {
      password: string;
    };
    return result;
  }

  async refreshToken(userId: string): Promise<{ access_token: string }> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('Invalid user');
    }

    const payload = {
      email: user.email,
      sub: userId,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    return { access_token: accessToken };
  }

  async checkPassword(userId: string, password: string): Promise<boolean> {
    // Ensure password field is selected
    const fetchedPassword = await this.usersService.findPasswordById(userId);
    if (!fetchedPassword) {
      throw new NotFoundException('User not found or password not available');
    }

    return bcrypt.compare(password, fetchedPassword);
  }

  logout(token: string): Promise<void> {
    // Add the token to invalidated tokens set
    this.invalidatedTokens.add(token);

    // Optional: Clean up old tokens periodically
    this.cleanupInvalidatedTokens();

    return Promise.resolve();
  }

  isTokenInvalid(token: string): boolean {
    return this.invalidatedTokens.has(token);
  }

  private cleanupInvalidatedTokens() {
    // Clean up tokens older than 24 hours
    setTimeout(
      () => {
        this.invalidatedTokens.clear();
      },
      24 * 60 * 60 * 1000,
    );
  }
}
