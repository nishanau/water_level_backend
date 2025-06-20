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
import { UserResponse } from './types/auth.types';
import { ref } from 'process';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto): Promise<UserResponse> {
    console.log('Registering user:', createUserDto);
    return this.authService.register(createUserDto);
  }

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    console.log('Attempting login for email:', loginDto.email);
    const userExists = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
      // Default to 'user' if no role is provided
    );

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
        maxAge: 60 * 60 * 1000, // 1 hour
      });
      res.cookie('refresh_token', refresh_token, {
        httpOnly: true,
        sameSite: 'lax',
        // secure: true, // Uncomment if using HTTPS
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
      console.log('Set-Cookie headers:', res.getHeaders()['set-cookie']);

      return { user };
    }
    return { user, access_token, refresh_token };
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

  @Get('me')
  async getProfile(@Req() req, @Res({ passthrough: true }) res: Response) {
    // Try to get token from Authorization header or cookies
    let token = req.headers.authorization?.split(' ')[1];
    let refreshToken = req.cookies['refresh_token'] || null;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!token && req.cookies && req.cookies['access_token']) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      token = req.cookies['access_token'];
    }

    if (!token && !refreshToken) {
      throw new UnauthorizedException('No token provided');
    }
    if (!token && refreshToken) {
      token = await this.authService.refreshToken(refreshToken);
      token = token.access_token; // Assuming refreshToken returns an object with access_token
    }

    try {
      // Verify token
      const payload = await this.authService.verifyToken(token);
      const user = this.authService.getProfile(payload.userId, payload.email);
      res.cookie('access_token', token, {
        httpOnly: true,
        sameSite: 'lax',
        // secure: true, // Uncomment if using HTTPS
        maxAge: 60 * 60 * 1000, // 1 hour
      });

      // Fetch user profile using payload.sub or payload.userId
      return user;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
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
