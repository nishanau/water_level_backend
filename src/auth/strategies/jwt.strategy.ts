import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { SuppliersService } from '../../suppliers/suppliers.service';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { UserResponse, Payload, SupplierResponse } from '../types/auth.types';

/**
 * Response structure returned by the JWT strategy's validate method
 */
export interface JwtStrategyResponse {
  userData: UserResponse | SupplierResponse | null;
  userId: string;
  email: string;
  role: string;
  newToken: string | null;
  newTokenFlag: boolean;
}

/**
 * JWT Authentication Strategy
 *
 * Handles authentication using JWT tokens from:
 * - Authorization headers (Bearer token)
 * - Cookies (access_token and refresh_token)
 *
 * Provides automatic token refresh when access tokens expire.
 */
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

  /**
   * Extracts JWT token from the request
   *
   * Checks for tokens in the following order:
   * 1. Authorization header (Bearer token)
   * 2. access_token cookie
   *
   * @param req - The Express request object
   * @returns The extracted token or null if no token found
   */
  static extractToken(req: Request): string | null {
    // 1. Check Authorization header for access token
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }
    // 2. If Authorization header is not present, check access_token cookie
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (req.cookies && req.cookies['access_token']) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      return req.cookies['access_token'];
    }
    // No token found
    return null;
  }

  /**
   * Validates the JWT token and loads user data
   *
   * This method:
   * 1. Verifies the access token
   * 2. Falls back to refresh token if access token is expired
   * 3. Generates a new access token if refresh token is valid
   * 4. Loads the user or supplier data
   *
   * @param req - The Express request object
   * @returns User data and token status information
   * @throws UnauthorizedException if tokens are invalid or user not found
   */
  async validate(req: Request) {
    const secret =
      this.configService.get<string>('JWT_SECRET') || 'super-secret-key';
    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      'super-secret-key';
    let token: string;
    let payload: Payload | null = null;
    let newToken: string | null = null;
    let newTokenFlag = false;

    // 1. Check Authorization header
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      console.log('Access token from header:', token);
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (req.cookies && req.cookies['access_token']) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        token = req.cookies['access_token'];

        try {
          payload = jwt.verify(token, secret) as Payload;
        } catch {
          // Access token invalid/expired, try refresh_token cookie
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const refreshToken = req.cookies['refresh_token'] as string;

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
              const errorMessage =
                e && typeof e === 'object' && 'message' in e
                  ? String((e as { message?: unknown }).message)
                  : undefined;
              throw new UnauthorizedException(
                'Invalid or expired refresh token',
                errorMessage,
              );
            }
          } else {
            throw new UnauthorizedException('Invalid or expired access token');
          }
        }
      }
    }
    if (!payload) {
      throw new UnauthorizedException('Invalid token');
    }

    // 3. User lookup
    let allUserData: UserResponse | SupplierResponse | null =
      await this.usersService.findById(String(payload.userId));
    if (!allUserData) {
      allUserData = await this.suppliersService.findOne(String(payload.userId));
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
    } as JwtStrategyResponse;
  }
}
