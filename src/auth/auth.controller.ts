/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Res, Req } from '@nestjs/common';
import { Response } from 'express';

import { CreateSupplierDto } from '../suppliers/dto/create-supplier.dto';
import { SupplierResponse, UserResponse } from './types/auth.types';
import { JwtStrategyResponse } from './strategies/jwt.strategy';

/**
 * Authentication controller handling user registration, login, and account management
 *
 * This controller provides endpoints for authentication-related operations including
 * user and supplier registration, login, email verification, password management,
 * and session handling.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Registers a new customer user in the system
   *
   * @param createUserDto - Data for creating a new user
   * @returns Object with success status and message
   */
  @Post('register-user')
  async registerUser(
    @Body() createUserDto: CreateUserDto,
  ): Promise<{ success: boolean; message: string }> {
    console.log('Registering user:', createUserDto);
    return this.authService.registerUser(createUserDto);
  }

  /**
   * Registers a new supplier in the system
   *
   * @param createSupplierDto - Data for creating a new supplier
   * @returns Object with success status and message
   */
  @Post('register-supplier')
  async registerSupplier(
    @Body() createSupplierDto: CreateSupplierDto,
  ): Promise<{ success: boolean; message: string }> {
    console.log('Registering supplier:', createSupplierDto);
    return this.authService.registerSupplier(createSupplierDto);
  }

  /**
   * Verifies the email address of a user or supplier
   *
   * @param body - Contains email and verification token
   * @returns Object with success status and message
   */
  @Post('verify-email')
  async verifyEmail(
    @Body() body: { email: string; token: string },
  ): Promise<{ success: boolean; message: string }> {
    const { email, token } = body;
    return this.authService.verifyEmail(email, token);
  }

  /**
   * Login endpoint for users and suppliers
   *
   * @param loginDto - The login credentials containing email and password
   * @param res - The response object to set cookies for access and refresh tokens
   * @throws UnauthorizedException if the email or password is invalid
   * @returns The user object along with access and refresh tokens
   */
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    console.log(
      'Attempting login for email:',
      loginDto.email,
      loginDto.password,
    );
    const userExists = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
      // Default to 'user' if no role is provided
    );
    console.log('User exists:', userExists);

    if (!userExists) {
      console.error('Login failed: Invalid email or password');
      throw new UnauthorizedException('Invalid email or password');
    }

    const { user, access_token, refresh_token } =
      await this.authService.login(userExists);
    console.log('Login successful for userId:', user);

    // If supplier, set tokens in cookies
    if (user.role !== 'customer') {
      res.cookie('access_token', access_token, {
        httpOnly: true,
        sameSite: 'lax',
        // secure: true, // Uncomment if using HTTPS
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
      res.cookie('refresh_token', refresh_token, {
        httpOnly: true,
        sameSite: 'lax',
        // secure: true, // Uncomment if using HTTPS
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return { user };
    }
    return { user, access_token, refresh_token };
  }

  /**
   * Updates the password for the logged-in user
   *
   * @param req - Request object containing user information
   * @param updatePasswordDto - Object containing old and new passwords
   * @returns Result of the password update operation
   */
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  updatePassword(
    @Req() req: Request & { user: JwtStrategyResponse },
    @Body() updatePasswordDto: { oldPassword: string; newPassword: string },
  ) {
    if (!req.user || !req.user.userData) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.authService.updatePassword(
      req.user.userData,
      updatePasswordDto,
    );
  }

  // /**
  //  * Refreshes the access token for the user
  //  *
  //  * @param req - Request object containing cookies
  //  * @param res - Response object to set the new access token cookie
  //  * @returns Success status
  //  */
  // @Get('refresh-token')
  // async refreshToken(
  //   @Req() req: Request,
  //   @Res({ passthrough: true }) res: Response,
  // ) {
  //   // Extract refresh token from cookies
  //   const refreshToken = req.cookies['refresh_token'];

  //   if (!refreshToken) {
  //     throw new UnauthorizedException('No refresh token provided');
  //   }

  //   try {
  //     // Verify and use refresh token
  //     const result = await this.authService.refreshToken(refreshToken);

  //     // Set new access token in cookie
  //     res.cookie('access_token', result.access_token, {
  //       httpOnly: true,
  //       sameSite: 'lax',
  //       // secure: true, // Uncomment if using HTTPS
  //       maxAge: 60 * 60 * 1000, // 1 hour
  //     });

  //     return { success: true };
  //   } catch {
  //     throw new UnauthorizedException('Invalid or expired refresh token');
  //   }
  // }

  /**
   * Logs out the user by clearing access and refresh token cookies
   *
   * @param req - Request object containing authorization header or cookies
   * @param res - Response object to clear cookies
   * @returns Logout success message
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    let token = req.headers.authorization?.split(' ')[1];
    if (!token && req.cookies && req.cookies['access_token']) {
      token = req.cookies['access_token'];
    }
    //  await this.authService.logout(token);
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    return { message: 'Logged out successfully' };
  }

  /**
   * Retrieves the profile of the logged-in user
   *
   * @param req - Request object containing user information
   * @param res - Response object to set new access token cookie if needed
   * @returns User profile information
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(
    @Req() req: Request & { user: JwtStrategyResponse },
    @Res({ passthrough: true }) res: Response,
  ): UserResponse | SupplierResponse | null {
    const user = req.user.userData;
    if (req.user.newTokenFlag) {
      const token = req.user.newToken;
      res.cookie('access_token', token, {
        httpOnly: true,
        sameSite: 'lax',
        // secure: true, // Uncomment if using HTTPS
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
    }

    return user;
  }

  /**
   * Sends a verification code to the user's email for password recovery
   *
   * @param email - The email address of the user who requested password recovery
   * @returns Result of the operation
   */
  @Post('forgot-password')
  async sendForgotPasswordCode(@Body('email') email: string) {
    return await this.authService.sendForgotPasswordCode(email);
  }

  /**
   * Verifies the reset code sent to the user's email
   *
   * @param email - The email address of the user
   * @param code - The reset code sent to the email
   * @returns Result of the verification operation
   */
  @Post('verify-reset-code')
  async verifyResetCode(
    @Body('email') email: string,
    @Body('code') code: string,
  ) {
    return await this.authService.verifyResetCode(email, code);
  }

  /**
   * Resets the user's password
   *
   * @param email - The email address of the user
   * @param code - The reset code sent to the email
   * @param newPassword - The new password for the user
   * @returns Result of the password reset operation
   */
  @Post('reset-password')
  async resetPassword(
    @Body('email') email: string,
    @Body('code') code: string,
    @Body('newPassword') newPassword: string,
  ) {
    return await this.authService.resetPassword(email, code, newPassword);
  }

  // @Post('check-password')
  // @UseGuards(JwtAuthGuard)
  // @HttpCode(HttpStatus.OK)
  // async checkPassword(@Req() req: Request, @Body('password') password: string) {
  //   // console.log('Checking password for userId:', req.user.userId);
  //   const isValid: boolean = await this.authService.checkPassword(
  //     req.user.userId,
  //     password,
  //   );

  //   if (!isValid) {
  //     throw new UnauthorizedException('Invalid password');
  //   }
  //   return isValid;
  // }
}
