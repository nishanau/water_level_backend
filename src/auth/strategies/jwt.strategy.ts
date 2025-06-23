import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { SuppliersService } from '../../suppliers/suppliers.service';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { UserResponse } from '../types/auth.types';
import { Supplier } from 'src/models';
import { Payload } from '../types/auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    private suppliersService: SuppliersService,
  ) {
    super({
      jwtFromRequest: (req: Request) => JwtStrategy.extractToken(req),
      ignoreExpiration: true, // We'll handle expiration manually
      secretOrKey:
        configService.get<string>('JWT_SECRET') || 'super-secret-key',
      passReqToCallback: true,
    });
  }

  static extractToken(req: Request): string | null {
    // 1. Check Authorization header for access token
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }
    // 2. If Authorization header is not present, check access_token cookie
    if (req.cookies && req.cookies['access_token']) {
      return req.cookies['access_token'];
    }
    // No token found
    return null;
  }

  async validate(req: Request) {
    const secret =
      this.configService.get<string>('JWT_SECRET') || 'super-secret-key';
    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      'super-secret-key';
    let token: string;
    let payload: any = null;
    let newToken: string | null = null;
    let newTokenFlag = false;

    // 1. Check Authorization header
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      try {
        payload = jwt.verify(token, secret) as Payload;
      } catch {
        // Access token invalid/expired, try x-refresh-token header
        const refreshToken = req.headers['x-refresh-token'] as string;
        if (refreshToken) {
          try {
            payload = jwt.verify(refreshToken, refreshSecret) as Payload;
            // Generate new access token
            newToken = jwt.sign(
              {
                userId: payload.userId,
                email: payload.email,
                role: payload.role,
              },
              secret,
              { expiresIn: '1h' },
            );
            newTokenFlag = true;
          } catch {
            throw new UnauthorizedException('Invalid or expired refresh token');
          }
        } else {
          throw new UnauthorizedException('Invalid or expired access token');
        }
      }
    } else {
      // 2. Check access_token cookie
      if (req.cookies && req.cookies['access_token']) {
        token = req.cookies['access_token'];

        try {
          payload = jwt.verify(token, secret);
        } catch {
          // Access token invalid/expired, try refresh_token cookie
          const refreshToken = req.cookies['refresh_token'];

          if (refreshToken) {
            try {
              payload = jwt.verify(refreshToken, refreshSecret) as Payload;

              console.log('Refresh token payload:', payload);
              // Generate new access token
              newToken = jwt.sign(
                {
                  userId: payload.userId,
                  email: payload.email,
                  role: payload.role,
                },
                secret,
                { expiresIn: '1h' },
              );
              newTokenFlag = true;
            } catch (e) {
              throw new UnauthorizedException(
                'Invalid or expired refresh token',
                e.message,
              );
            }
          } else {
            throw new UnauthorizedException('Invalid or expired access token');
          }
        }
      }
    }

    // 3. User lookup
    let allUserData: UserResponse | Supplier | null =
      await this.usersService.findById(payload.userId);
    if (!allUserData) {
      allUserData = await this.suppliersService.findOne(payload.userId);
      if (!allUserData) {
        throw new UnauthorizedException('User not found');
      }
    }

    // 4. Return user info and token flag
    return {
      userData: allUserData,
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      newToken: newTokenFlag ? newToken : null,
      newTokenFlag,
    };
  }
}
