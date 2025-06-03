import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { AuthController } from './auth.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Tank, TankSchema } from '../models/tank.schema';
import { Order, OrderSchema } from '../models/order.schema';
import {
  Notification,
  NotificationSchema,
} from '../models/notification.schema';
import {
  PaymentMethod,
  PaymentMethodSchema,
} from '../models/payment-method.schema';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'super-secret-key',
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION') || '15m',
        },
        refreshToken: {
          secret:
            configService.get<string>('REFRESH_TOKEN_SECRET') ||
            'refresh-super-secret',
          expiresIn:
            configService.get<string>('REFRESH_TOKEN_EXPIRATION') || '7d',
        },
      }),
    }),
    MongooseModule.forFeature([
      { name: Tank.name, schema: TankSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: PaymentMethod.name, schema: PaymentMethodSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy],
  exports: [AuthService],
})
export class AuthModule {}
