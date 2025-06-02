import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WaterLevelsController } from './water-levels.controller';
import { WaterLevelsService } from './water-levels.service';
import { WaterLevel, WaterLevelSchema } from '../models/water-level.schema';
import { Tank, TankSchema } from '../models/tank.schema';
import { TanksModule } from '../tanks/tanks.module';
import { IoTController } from './iot.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WaterLevel.name, schema: WaterLevelSchema },
      { name: Tank.name, schema: TankSchema },
    ]),
    TanksModule,
  ],
  controllers: [WaterLevelsController, IoTController],
  providers: [WaterLevelsService],
  exports: [WaterLevelsService],
})
export class WaterLevelsModule {}
