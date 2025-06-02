import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WaterLevel, WaterLevelDocument } from '../models/water-level.schema';
import { Tank, TankDocument } from '../models/tank.schema';
import { CreateWaterLevelDto } from './dto/create-water-level.dto';
import { TanksService } from '../tanks/tanks.service';

@Injectable()
export class WaterLevelsService {
  constructor(
    @InjectModel(WaterLevel.name)
    private waterLevelModel: Model<WaterLevelDocument>,
    @InjectModel(Tank.name) private tankModel: Model<TankDocument>,
    private tanksService: TanksService,
  ) {}

  async create(
    createWaterLevelDto: CreateWaterLevelDto,
    userId: string,
    role: string,
  ): Promise<WaterLevelDocument> {
    // Verify user has access to this tank
    const tank = await this.tanksService.findOne(
      createWaterLevelDto.tankId,
      userId,
      role,
    );

    // Calculate volume in liters
    const volumeLiters = (createWaterLevelDto.level / 100) * tank.capacity;

    const waterLevel = new this.waterLevelModel({
      ...createWaterLevelDto,
      volumeLiters,
      timestamp: new Date(),
    });

    return waterLevel.save();
  }

  async findAll(
    tankId: string,
    userId: string,
    role: string,
  ): Promise<WaterLevelDocument[]> {
    // Verify user has access to this tank
    await this.tanksService.findOne(tankId, userId, role);

    return this.waterLevelModel.find({ tankId }).sort({ timestamp: -1 }).exec();
  }

  async findCurrent(
    tankId: string,
    userId: string,
    role: string,
  ): Promise<WaterLevelDocument> {
    // Verify user has access to this tank
    await this.tanksService.findOne(tankId, userId, role);

    const latestReading = await this.waterLevelModel
      .findOne({ tankId })
      .sort({ timestamp: -1 })
      .exec();

    if (!latestReading) {
      throw new NotFoundException(
        `No water level readings found for tank ${tankId}`,
      );
    }

    return latestReading;
  }

  // This endpoint will be used by IoT devices to report water levels
  async reportIoTWaterLevel(
    deviceId: string,
    level: number,
  ): Promise<WaterLevelDocument> {
    // Find the tank by deviceId
    const tank = await this.tankModel.findOne({ deviceId }).exec();

    if (!tank) {
      throw new NotFoundException(`No tank found with device ID ${deviceId}`);
    }

    // Calculate volume in liters
    const volumeLiters = (level / 100) * tank.capacity;

    const waterLevel = new this.waterLevelModel({
      tankId: tank._id,
      level,
      volumeLiters,
      source: 'sensor',
      timestamp: new Date(),
    });

    return waterLevel.save();
  }
}
