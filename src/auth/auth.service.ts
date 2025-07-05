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
import {
  UserResponse,
  LoginResponse,
  RegisterResponse,
} from './types/auth.types';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { SupplierResponse } from './types/auth.types';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Tank } from '../models/tank.schema';
import { Order } from '../models/order.schema';
import { Notification } from '../models/notification.schema';
import { PaymentMethod } from '../models/payment-method.schema';
import { Types } from 'mongoose';
import { CreateSupplierDto } from 'src/suppliers/dto/create-supplier.dto';
import * as nodemailer from 'nodemailer';
import { User, UserDocument } from 'src/models';
import { SupplierDocument } from 'src/models/supplier.schema';
import { JwtStrategyResponse } from './strategies/jwt.strategy';

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

  /**
   * Validates user email and password
   * @param email - User email
   * @param password - User password
   * @Returns UserResponse | SupplierResponse | null
   * throws NotFoundException if user or supplier not found
   */
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

  /**
   * Retrieves the profile of a user or supplier by userId and email
   *
   * @param userId - The ID of the user
   * @param email - The email of the user or supplier
   * @returns UserResponse or SupplierResponse
   * @throws NotFoundException if neither user nor supplier is found
   */
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
      const supplierObj = supplier.toJSON();
      const { password, ...supplierWithoutPassword } = supplierObj;
      return supplierWithoutPassword as SupplierResponse | UserResponse;
    }
    throw new NotFoundException('User not found');
  }

  async verifyToken(token: string): Promise<any> {
    try {
      return await this.jwtService.verifyAsync(token);
    } catch (err) {
      console.error('Token verification failed:', err);
      throw new UnauthorizedException(
        'Invalid or expired token',
        typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message?: unknown }).message)
          : undefined,
      );
    }
  }

  /**
   * Registers a new customer user in the system
   *
   * @param userData - User data for customer registration
   * @returns Object with success status and message
   * @throws BadRequestException for invalid input
   * @throws ConflictException if email already exists
   */
  async registerUser(userData: CreateUserDto): Promise<RegisterResponse> {
    // Validate required fields
    if (
      !userData.password ||
      userData.password.trim().length < 8 ||
      !userData.email
    ) {
      throw new BadRequestException(
        'All fields are required and password must be at least 8 characters.',
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      throw new BadRequestException('Invalid email format.');
    }

    // Check for existing user
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

    try {
      // Ensure the role is set to customer
      userData.role = 'customer';

      // Create the user
      const createdUser = await this.createUser(userData, hashedPassword);

      // Send verification email
      if (createdUser && createdUser.emailVerificationToken) {
        await this.sendVerificationEmail(
          userData.email,
          createdUser.emailVerificationToken,
        );
      }

      // Log registration
      console.log(`User registered: ${userData.email} (customer)`);

      return {
        success: true,
        message: 'Registration successful. Please verify your email.',
      };
    } catch (error) {
      // Log error for auditing
      console.error('User registration failed:', error);

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

  /**
   * Registers a new supplier in the system
   *
   * @param supplierData - Supplier data for registration
   * @returns Object with success status and message
   * @throws BadRequestException for invalid input
   * @throws ConflictException if email already exists
   */
  async registerSupplier(
    supplierData: CreateSupplierDto,
  ): Promise<RegisterResponse> {
    // Validate required fields
    if (
      !supplierData.password ||
      supplierData.password.trim().length < 8 ||
      !supplierData.email ||
      !supplierData.company
    ) {
      throw new BadRequestException(
        'All fields are required and password must be at least 8 characters.',
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(supplierData.email)) {
      throw new BadRequestException('Invalid email format.');
    }

    // Check for existing supplier
    let existingUser: any = await this.usersService.findByEmail(
      supplierData.email,
    );
    if (!existingUser) {
      existingUser = await this.supplierService.findByEmail(supplierData.email);
    }
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Hash the password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(supplierData.password, salt);

    try {
      // Ensure the role is set to supplier
      supplierData.role = 'supplier';

      // Create the supplier
      const createdSupplier = await this.createSupplier(
        supplierData,
        hashedPassword,
      );

      // Send verification email
      if (createdSupplier && createdSupplier.emailVerificationToken) {
        await this.sendVerificationEmail(
          supplierData.email,
          createdSupplier.emailVerificationToken,
        );
      }

      // Log registration
      console.log(`Supplier registered: ${supplierData.email} (supplier)`);

      return {
        success: true,
        message: 'Registration successful. Please verify your email.',
      };
    } catch (error) {
      // Log error for auditing
      console.error('Supplier registration failed:', error);

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

  /**
   * Creates a new customer user in the system
   *
   * @param userData - User data from registration form
   * @param hashedPassword - Pre-hashed password string
   * @returns The created user document
   * @private
   */
  private async createUser(
    userData: CreateUserDto,
    hashedPassword: string,
  ): Promise<UserResponse> {
    return await this.usersService.create({
      ...userData,
      password: hashedPassword,
    });
  }

  /**
   * Creates a new supplier in the system
   *
   * @param userData - Supplier data from registration form
   * @param hashedPassword - Pre-hashed password string
   * @returns The created supplier document
   * @throws BadRequestException if company name is missing
   * @private
   */
  private async createSupplier(
    userData: CreateSupplierDto,
    hashedPassword: string,
  ): Promise<SupplierResponse> {
    if (!('company' in userData) || !userData['company']) {
      throw new BadRequestException('Company is required for suppliers');
    }

    return this.supplierService.create({
      ...userData,
      password: hashedPassword,
    });
  }

  /**
   * Verifies the email of a user or supplier
   *
   * @param email - User email
   * @param token - Verification token
   * @returns Success message
   * @throws NotFoundException if user or supplier not found
   * @throws BadRequestException if token is invalid or expired
   */
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
    user: UserResponse | SupplierResponse,
    updatePasswordDto: {
      oldPassword: string;
      newPassword: string;
    },
  ): Promise<{ message: string }> {
    if (user.role === 'supplier') {
      // Update supplier password
      const supplier = await this.supplierService.findById(String(user._id));
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
      const customer = await this.usersService.findbyIdWithPassword(
        String(user._id),
      );
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
  // async refreshToken(refreshToken: string): Promise<{ access_token: string }> {
  //   try {
  //     // If you don't have configService, you can use your JWT_REFRESH_SECRET directly
  //     // or however you're accessing your environment variables
  //     const payload = await this.jwtService.verifyAsync(refreshToken, {
  //       secret: process.env.JWT_REFRESH_SECRET,
  //     });

  //     // Check if token is expired
  //     const now = Math.floor(Date.now() / 1000);
  //     if (payload.exp && payload.exp < now) {
  //       throw new UnauthorizedException('Refresh token has expired');
  //     }

  //     // Find the user
  //     const user = await this.usersService.findById(payload.userId);
  //     if (!user) {
  //       throw new UnauthorizedException('User no longer exists');
  //     }

  //     // Generate a new access token
  //     const newAccessToken = await this.jwtService.signAsync(
  //       {
  //         userId: user._id,
  //         email: user.email,
  //         role: user.role,
  //       },
  //       {
  //         secret: process.env.JWT_SECRET,
  //         expiresIn: '1h', // Access token expiration
  //       },
  //     );

  //     return { access_token: newAccessToken };
  //   } catch (error) {
  //     // Handle different types of errors
  //     if (error.name === 'JsonWebTokenError') {
  //       console.error('JSON Web Token error:', error.message);
  //       throw new UnauthorizedException('Invalid refresh token');
  //     }
  //     if (error.name === 'TokenExpiredError') {
  //       throw new UnauthorizedException('Refresh token has expired');
  //     }
  //     // Re-throw the error if it's already an HTTP exception
  //     if (error instanceof HttpException) {
  //       throw error;
  //     }
  //     // For any other errors
  //     throw new UnauthorizedException('Could not refresh token');
  //   }
  // }

  /**
   * Checks if the provided password matches the stored password for the user
   *
   * @param userId - The ID of the user
   * @param password - The password to check
   * @returns True if the password matches, false otherwise
   * @throws NotFoundException if user not found or password not available
   */
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
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9f9f9;
            }
            .header {
              background-color: #0078d4;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: white;
              padding: 20px;
              border-radius: 0 0 5px 5px;
              box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            }
            .button {
              display: inline-block;
              background-color: #0078d4;
              color: white;
              text-decoration: none;
              padding: 12px 30px;
              margin: 20px 0;
              border-radius: 4px;
              font-weight: bold;
            }
            .footer {
              margin-top: 20px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Welcome to AquaPulse!</h2>
            </div>
            <div class="content">
              <h3>Almost done!</h3>
              <p>Please verify your email address to complete your registration and get started with AquaPulse.</p>
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email</a>
              </div>
              <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
              <p style="word-break: break-all; font-size: 14px;">${verificationUrl}</p>
              <p>If you did not request this, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} AquaPulse. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.transporter.sendMail(mailOptions);
  }
  /**
   * Sends a password reset code to the user's email
   *
   * @param email - The email address of the user
   * @returns Object with success status
   * @throws NotFoundException if user or supplier not found
   */
  async sendForgotPasswordCode(email: string) {
    // 1. Check if user exists (customer or supplier)
    let user: UserDocument | SupplierDocument | null =
      await this.usersService.findByEmail(email);
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.transporter.sendMail({
      from: '"AquaPulse" <aquapulse69@email.com>',
      to: email,
      subject: 'AquaPulse Password Reset Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9f9f9;
            }
            .header {
              background-color: #0078d4;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: white;
              padding: 20px;
              border-radius: 0 0 5px 5px;
              box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            }
            .code-box {
              background-color: #f0f0f0;
              padding: 15px;
              text-align: center;
              font-size: 24px;
              font-weight: bold;
              letter-spacing: 5px;
              margin: 20px 0;
              border-radius: 4px;
              border: 1px dashed #ccc;
            }
            .footer {
              margin-top: 20px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Password Reset Request</h2>
            </div>
            <div class="content">
              <h3>Hello,</h3>
              <p>We received a request to reset your password. Please use the following code to complete your password reset:</p>
              <div class="code-box">${code}</div>
              <p>This code will expire in <b>10 minutes</b>.</p>
              <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} AquaPulse. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    // 4. Return { success: true }
    return { success: true };
  }

  /**
   * Verifies a password reset code sent to a user's email
   *
   * @param email - The email address of the user
   * @param code - The reset code that was sent to the user's email
   * @returns Object with success status and optional error message
   * @throws No exceptions - errors are returned as { success: false, message: string }
   */
  async verifyResetCode(email: string, code: string) {
    // 1. Find user (customer or supplier)
    let user: UserDocument | SupplierDocument | null =
      await this.usersService.findByEmail(email);
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

  /**
   * Resets a user's password using a verification code
   *
   * @param email - The email address of the user
   * @param code - The reset code that was sent to the user's email
   * @param newPassword - The new password to set
   * @returns Object with success status
   * @throws NotFoundException if user is not found
   * @throws BadRequestException if code is invalid or expired
   */
  async resetPassword(email: string, code: string, newPassword: string) {
    // 1. Find user (customer or supplier)
    let user: UserDocument | SupplierDocument | null =
      await this.usersService.findByEmail(email);
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
    user.resetPasswordCode = '';
    user.resetPasswordCodeExpiry = null;
    await user.save();

    return { success: true };
  }
}
