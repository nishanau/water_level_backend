import {
  Controller,
  Post,
  Body,
  Request,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserResponse } from './types/auth.types';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto): Promise<UserResponse> {
    console.log('Registering user:', createUserDto);
    return this.authService.register(createUserDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    console.log('Attempting login for email:', loginDto.email);
    const userExists = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );

    if (!userExists) {
      console.error('Login failed: Invalid email or password');
      throw new UnauthorizedException('Invalid email or password');
    }

    const { user, access_token, refresh_token } = await this.authService.login(userExists);
    console.log('Login successful for userId:', user);
    console.log('Access token generated:', access_token);
    return { user, access_token, refresh_token };
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Request() req) {
    console.log('Refreshing token for userId:', req.user.userId);
    return this.authService.refreshToken(req.user.userId);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }
    await this.authService.logout(token);
    return { message: 'Logged out successfully' };
  }
}
