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

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register-user')
  async registerUser(
    @Body() createUserDto: CreateUserDto,
  ): Promise<{ success: boolean; message: string }> {
    console.log('Registering user:', createUserDto);
    return this.authService.register(createUserDto);
  }

  @Post('register-supplier')
  async registerSupplier(
    @Body() createSupplierDto: CreateSupplierDto,
  ): Promise<{ success: boolean; message: string }> {
    console.log('Registering supplier:', createSupplierDto);
    return this.authService.register(createSupplierDto);
  }

  @Post('verify-email')
  async verifyEmail(
    @Body() body: { email: string; token: string },
  ): Promise<{ success: boolean; message: string }> {
    const { email, token } = body;
    return this.authService.verifyEmail(email, token);
  }

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
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

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  updatePassword(
    @Req() req,
    @Body() updatePasswordDto: { oldPassword: string; newPassword: string },
  ) {
    console.log('user', req.user.userData);
    return this.authService.updatePassword(
      req.user.userData,
      updatePasswordDto,
    );
  }

  @Get('refresh-token')
  async refreshToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Extract refresh token from cookies
    const refreshToken = req.cookies['refresh_token'];

    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    try {
      // Verify and use refresh token
      const result = await this.authService.refreshToken(refreshToken);

      // Set new access token in cookie
      res.cookie('access_token', result.access_token, {
        httpOnly: true,
        sameSite: 'lax',
        // secure: true, // Uncomment if using HTTPS
        maxAge: 60 * 60 * 1000, // 1 hour
      });

      return { success: true };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

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

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Req() req, @Res({ passthrough: true }) res: Response) {
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

  @Post('forgot-password')
  async sendForgotPasswordCode(@Body('email') email: string) {
    return await this.authService.sendForgotPasswordCode(email);
  }

  @Post('verify-reset-code')
  async verifyResetCode(
    @Body('email') email: string,
    @Body('code') code: string,
  ) {
    return await this.authService.verifyResetCode(email, code);
  }

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
