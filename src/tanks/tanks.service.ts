import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Tank, TankDocument } from '../models/tank.schema';
import { CreateTankDto } from './dto/create-tank.dto';
import { UpdateTankDto } from './dto/update-tank.dto';

@Injectable()
export class TanksService {
  constructor(@InjectModel(Tank.name) private tankModel: Model<TankDocument>) {}

  async create(
    createTankDto: CreateTankDto,
    userId: string,
  ): Promise<TankDocument> {
    const newTank = new this.tankModel({
      ...createTankDto,
      userId,
    });
    return newTank.save();
  }

  async findAll(userId: string, role: string): Promise<TankDocument[]> {
    // If admin, can view all tanks
    if (role === 'admin') {
      return this.tankModel.find().exec();
    }

    // Otherwise, users can only view their own tanks
    return this.tankModel.find({ userId }).exec();
  }

  async findOne(
    id: string,
    userId: string,
    role: string,
  ): Promise<TankDocument> {
    const tank = await this.tankModel.findById(id).exec();

    if (!tank) {
      throw new NotFoundException(`Tank with ID ${id} not found`);
    }

    // Check if user has permission to access this tank
    let tankUserId: string;

    if (tank.userId instanceof Types.ObjectId) {
      tankUserId = tank.userId.toString();
    } else if (typeof tank.userId === 'string') {
      tankUserId = tank.userId;
    } else {
      // Fallback for other cases
      try {
        if (
          tank.userId &&
          typeof tank.userId === 'object' &&
          'toString' in tank.userId
        ) {
          tankUserId = String(tank.userId);
        } else {
          tankUserId = '';
        }
      } catch (err) {
        // In case of any error, set to empty string
        tankUserId = '';
      }
    }

    if (role !== 'admin' && tankUserId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this tank',
      );
    }

    return tank;
  }

  async update(
    id: string,
    updateTankDto: UpdateTankDto,
    userId: string,
    role: string,
  ): Promise<TankDocument> {
    const tank = await this.findOne(id, userId, role);

    // Apply updates
    Object.assign(tank, updateTankDto);

    return tank.save();
  }

  async remove(
    id: string,
    userId: string,
    role: string,
  ): Promise<TankDocument> {
    // First check if the tank exists and if the user has permission to access it
    await this.findOne(id, userId, role);

    // Then delete the tank
    const deletedTank = await this.tankModel.findByIdAndDelete(id).exec();

    if (!deletedTank) {
      throw new NotFoundException(`Tank with ID ${id} not found`);
    }

    return deletedTank;
  }
}
