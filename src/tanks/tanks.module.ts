import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TanksController } from './tanks.controller';
import { TanksService } from './tanks.service';
import { Tank, TankSchema } from '../models/tank.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Tank.name, schema: TankSchema }]),
  ],
  controllers: [TanksController],
  providers: [TanksService],
  exports: [TanksService],
})
export class TanksModule {}
