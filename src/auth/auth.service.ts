/* eslint-disable @typescript-eslint/no-unused-vars */
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
import { CreateSupplierDto } from 'src/suppliers/dto/create-supplier.dto';
import * as nodemailer from 'nodemailer';
import { UserDocument } from 'src/models';
import { SupplierDocument } from 'src/models/supplier.schema';

@Injectable()
export class AuthService {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  private transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', // Replace with your SMTP server
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

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
        console.log(`given password: ${password}`);
        console.log(`hashed password: ${supplier.password}`);
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

      const orders = await this.orderModel
        .find({ userId: user._id })
        .select('_id');
      const paymentMethods = await this.paymentMethodModel
        .find({ userId: user._id })
        .select('_id');

      return {
        user: {
          ...user,
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

  async register(
    userData: CreateUserDto | CreateSupplierDto,
  ): Promise<{ success: boolean; message: string }> {
    // Stronger validation
    if (
      !userData.password ||
      userData.password.trim().length < 8 ||
      !userData.email ||
      !userData.role
    ) {
      throw new BadRequestException(
        'All fields are required and password must be at least 8 characters.',
      );
    }

    // Email format validation (basic)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      throw new BadRequestException('Invalid email format.');
    }

    // // Optional: Phone number format validation (basic)
    // if ('phoneNumber' in userData && userData.phoneNumber) {
    //   const phoneRegex = /^[0-9+\-\s()]{7,20}$/;
    //   if (!phoneRegex.test(userData.phoneNumber)) {
    //     throw new BadRequestException('Invalid phone number format.');
    //   }
    // }

    // Check for existing user or supplier
    let existingUser: any = await this.usersService.findByEmail(userData.email);
    if (!existingUser) {
      existingUser = await this.supplierService.findByEmail(userData.email);
    }
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Hash the password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(userData.password, salt);
    let createdUser;
    // Create user or supplier
    try {
      if (userData.role === 'customer') {
        createdUser = await this.usersService.create({
          ...userData,
          password: hashedPassword,
        });
      } else if (userData.role === 'supplier') {
        if (!('company' in userData) || !userData['company']) {
          throw new BadRequestException('Company is required for suppliers');
        }
        await this.supplierService.create({
          ...userData,
          password: hashedPassword,
        });
      } else {
        throw new BadRequestException('Invalid user role');
      }

      // Email verification stub (implement actual email sending here)
      await this.sendVerificationEmail(
        userData.email,
        createdUser.emailVerificationToken,
      );

      // Log registration
      console.log(`User registered: ${userData.email} (${userData.role})`);

      return {
        success: true,
        message: 'Registration successful. Please verify your email.',
      };
    } catch (error) {
      // Log error for auditing
      console.error('Registration failed:', error);

      // Rethrow known HTTP exceptions
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      // Handle any other errors
      throw new BadRequestException('Registration failed. Please try again.');
    }
  }
  async verifyEmail(
    email: string,
    token: string,
  ): Promise<{ success: boolean; message: string }> {
    // Check if user exists
    let user: UserDocument | SupplierDocument | null =
      await this.usersService.findByEmail(email);
    if (!user) {
      user = await this.supplierService.findByEmail(email);
    }
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.isEmailVerified) {
      return { success: true, message: 'Email already verified.' };
    }
    if (user.emailVerificationToken !== token) {
      throw new BadRequestException('Invalid or expired verification token');
    }
    user.isEmailVerified = true;
    user.emailVerificationToken = '';
    await user.save();
    return { success: true, message: 'Email verified successfully.' };
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

  async sendVerificationEmail(to: string, verificationToken: string) {
    const verificationUrl = `http://localhost:3001/verify-email?token=${verificationToken}&email=${encodeURIComponent(to)}`;

    const mailOptions = {
      from: '"AquaPulse" <aquapulse69@email.com>',
      to,
      subject: 'Verify your email address',
      html: `
        <h3>Welcome!</h3>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="${verificationUrl}">Verify Email</a>
        <p>If you did not request this, please ignore this email.</p>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendForgotPasswordCode(email: string) {
    // 1. Check if user exists (customer or supplier)
    let user: any = await this.usersService.findByEmail(email);
    let isSupplier = false;
    if (!user) {
      user = await this.supplierService.findByEmail(email);
      isSupplier = true;
    }
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 2. Generate code and expiry (10 min)
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    user.resetPasswordCode = code;
    user.resetPasswordCodeExpiry = expiry;
    await user.save();

    // 3. Send code to user's email
    await this.transporter.sendMail({
      from: '"AquaPulse" <aquapulse69@email.com>',
      to: email,
      subject: 'AquaPulse Password Reset Code',
      html: `
        <h3>Password Reset Request</h3>
        <p>Your password reset code is: <b>${code}</b></p>
        <p>This code will expire in 10 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    });

    // 4. Return { success: true }
    return { success: true };
  }

  async verifyResetCode(email: string, code: string) {
    // 1. Find user (customer or supplier)
    let user: any = await this.usersService.findByEmail(email);
    if (!user) user = await this.supplierService.findByEmail(email);
    if (!user) return { success: false, message: 'User not found' };

    // 2. Check code and expiry
    if (
      !user.resetPasswordCode ||
      !user.resetPasswordCodeExpiry ||
      user.resetPasswordCode !== code ||
      new Date(user.resetPasswordCodeExpiry) < new Date()
    ) {
      return { success: false, message: 'Invalid or expired code' };
    }
    return { success: true };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    // 1. Find user (customer or supplier)
    let user: any = await this.usersService.findByEmail(email);
    if (!user) user = await this.supplierService.findByEmail(email);
    if (!user) throw new NotFoundException('User not found');

    // 2. Verify code and expiry
    if (
      !user.resetPasswordCode ||
      !user.resetPasswordCodeExpiry ||
      user.resetPasswordCode !== code ||
      new Date(user.resetPasswordCodeExpiry) < new Date()
    ) {
      throw new BadRequestException('Invalid or expired code');
    }

    // 3. Hash and update password
    const salt = await bcrypt.genSalt();
    user.password = await bcrypt.hash(newPassword, salt);

    // 4. Invalidate code
    user.resetPasswordCode = undefined;
    user.resetPasswordCodeExpiry = undefined;
    await user.save();

    return { success: true };
  }
}
