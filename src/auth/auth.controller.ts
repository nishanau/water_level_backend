import {
  Controller,
  Post,
  Body,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  CreateUserDto,
  LoginDto,
  UserResponse,
  LoginResponse,
} from './types/auth.types';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto): Promise<UserResponse> {
    return this.authService.register(createUserDto);
  }

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Request() req,
  ): Promise<LoginResponse> {
    return this.authService.login(req.user);
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Request() req) {
    return this.authService.refreshToken(req.user.userId);
  }
}
