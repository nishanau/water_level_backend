import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto, UserResponse, LoginResponse } from './types/auth.types';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(
    email: string,
    password: string,
  ): Promise<UserResponse | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pass, ...result } = user.toObject() as UserResponse & {
      password: string;
    };
    return result;
  }

  async login(user: UserResponse): Promise<LoginResponse> {
    const payload = {
      email: user.email,
      sub: user._id,
      role: user.role,
    };

    return {
      user,
      access_token: await this.jwtService.signAsync(payload),
    };
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pass, ...result } =
      createdUser.toObject() as UserResponse & {
        password: string;
      };
    return result;
  }

  async refreshToken(userId: string): Promise<{ access_token: string }> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Invalid user');
    }

    const payload = {
      email: user.email,
      sub: user._id,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
