import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, Error as MongooseError } from 'mongoose';
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
    try {
      if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
        throw new BadRequestException(`Invalid user ID format: ${userId}`);
      }

      const newTank = new this.tankModel({
        ...createTankDto,
        userId,
      });
      return await newTank.save();
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof MongooseError.ValidationError) {
        throw new BadRequestException(`Validation failed: ${error.message}`);
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new InternalServerErrorException(
        'Failed to create tank',
        errorMessage,
      );
    }
  }

  async findAll(userId: string, role: string): Promise<TankDocument[]> {
    try {
      // If admin, can view all tanks
      if (role === 'admin') {
        return await this.tankModel.find().exec();
      }

      // Otherwise, users can only view their own tanks
      if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
        throw new BadRequestException(`Invalid user ID format: ${userId}`);
      }

      return await this.tankModel.find({ userId }).exec();
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new InternalServerErrorException(
        'Failed to retrieve tanks',
        errorMessage,
      );
    }
  }

  async findOne(
    id: string,
    userId: string,
    role: string,
  ): Promise<TankDocument> {
    try {
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        throw new BadRequestException(`Invalid tank ID format: ${id}`);
      }

      if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
        throw new BadRequestException(`Invalid user ID format: ${userId}`);
      }

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
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new InternalServerErrorException(
        `Failed to find tank with ID ${id}`,
        errorMessage,
      );
    }
  }

  async update(
    id: string,
    updateTankDto: UpdateTankDto,
    userId: string,
    role: string,
  ): Promise<TankDocument> {
    try {
      const tank = await this.findOne(id, userId, role);

      // Apply updates
      Object.assign(tank, updateTankDto);

      return await tank.save();
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      if (error instanceof MongooseError.ValidationError) {
        throw new BadRequestException(`Validation failed: ${error.message}`);
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new InternalServerErrorException(
        `Failed to update tank with ID ${id}`,
        errorMessage,
      );
    }
  }

  async remove(
    id: string,
    userId: string,
    role: string,
  ): Promise<TankDocument> {
    try {
      // First check if the tank exists and if the user has permission to access it
      await this.findOne(id, userId, role);

      // Then delete the tank
      const deletedTank = await this.tankModel.findByIdAndDelete(id).exec();

      if (!deletedTank) {
        throw new NotFoundException(`Tank with ID ${id} not found`);
      }

      return deletedTank;
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new InternalServerErrorException(
        `Failed to delete tank with ID ${id}`,
        errorMessage,
      );
    }
  }
}
