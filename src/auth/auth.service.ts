import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  HttpException,
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
    console.log(`User found: ${user ? 'Yes' : 'No'}`);
    if (!user) {
      const supplier = await this.supplierService.findByEmail(email.trim());
      console.log(`Supplier found: ${supplier ? 'Yes' : 'No'}`);
      // If supplier is
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
      userId: user._id,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: '60s',
      }),
      this.jwtService.signAsync(
        { ...payload, tokenType: 'refresh' },
        { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '7d' },
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
      console.error('Token verification failed:', err);
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

  async updatePassword(
    user,
    updatePasswordDto: {
      oldPassword: string;
      newPassword: string;
    },
  ): Promise<{ message: string }> {
    if (user.role === 'supplier') {
      // Update supplier password
      const supplier = await this.supplierService.findById(user._id);
      if (!supplier) {
        throw new NotFoundException('Supplier not found');
      }
      const isMatch = await bcrypt.compare(
        updatePasswordDto.oldPassword,
        supplier.password,
      );
      if (!isMatch) {
        throw new BadRequestException('Old password is incorrect');
      }

      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(
        updatePasswordDto.newPassword,
        salt,
      );
      supplier.password = hashedPassword;
      await supplier.save();
    } else {
      // Update user password
      const customer = await this.usersService.findbyIdWithPassword(user._id);
      if (!customer) {
        throw new NotFoundException('User not found');
      }
      const isMatch = await bcrypt.compare(
        updatePasswordDto.oldPassword,
        customer.password,
      );
      if (!isMatch) {
        throw new BadRequestException('Old password is incorrect');
      }

      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(
        updatePasswordDto.newPassword,
        salt,
      );

      customer.password = hashedPassword;
      await customer.save();
    }

    return { message: 'Password updated successfully' };
  }

  // In auth.service.ts
  // In auth.service.ts
  async refreshToken(refreshToken: string): Promise<{ access_token: string }> {
    try {
      // If you don't have configService, you can use your JWT_REFRESH_SECRET directly
      // or however you're accessing your environment variables
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        throw new UnauthorizedException('Refresh token has expired');
      }

      // Find the user
      const user = await this.usersService.findById(payload.userId);
      if (!user) {
        throw new UnauthorizedException('User no longer exists');
      }

      // Generate a new access token
      const newAccessToken = await this.jwtService.signAsync(
        {
          userId: user._id,
          email: user.email,
          role: user.role,
        },
        {
          secret: process.env.JWT_SECRET,
          expiresIn: '1h', // Access token expiration
        },
      );

      return { access_token: newAccessToken };
    } catch (error) {
      // Handle different types of errors
      if (error.name === 'JsonWebTokenError') {
        console.error('JSON Web Token error:', error.message);
        throw new UnauthorizedException('Invalid refresh token');
      }
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Refresh token has expired');
      }
      // Re-throw the error if it's already an HTTP exception
      if (error instanceof HttpException) {
        throw error;
      }
      // For any other errors
      throw new UnauthorizedException('Could not refresh token');
    }
  }

  async checkPassword(userId: string, password: string): Promise<boolean> {
    // Ensure password field is selected
    const fetchedPassword = await this.usersService.findPasswordById(userId);
    if (!fetchedPassword) {
      throw new NotFoundException('User not found or password not available');
    }

    return bcrypt.compare(password, fetchedPassword);
  }

  // logout(token: string): Promise<void> {
  //   // Add the token to invalidated tokens set
  //   this.invalidatedTokens.add(token);

  //   // Optional: Clean up old tokens periodically
  //   //this.cleanupInvalidatedTokens();

  //   return Promise.resolve();
  // }

  // isTokenInvalid(token: string): boolean {
  //   return this.invalidatedTokens.has(token);
  // }

  // private cleanupInvalidatedTokens() {
  //   // Clean up tokens older than 24 hours
  //   setTimeout(
  //     () => {
  //       this.invalidatedTokens.clear();
  //     },
  //     24 * 60 * 60 * 1000,
  //   );
  // }
}
