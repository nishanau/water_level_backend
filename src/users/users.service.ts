import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Error as MongooseError } from 'mongoose';
import { User, UserDocument } from '../models/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { UserResponse } from 'src/auth/types/auth.types';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    try {
      const newUser = new this.userModel(createUserDto);
      return await newUser.save();
    } catch (error: unknown) {
      if (error instanceof MongooseError.ValidationError) {
        throw new BadRequestException(`Validation failed: ${error.message}`);
      }
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 11000
      ) {
        throw new BadRequestException('A user with this email already exists');
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new InternalServerErrorException(
        'Failed to create user',
        errorMessage,
      );
    }
  }

  async findAll(): Promise<Omit<User, 'password'>[]> {
    try {
      const users = await this.userModel.find().exec();
      return users.map((user) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...userWithoutPassword } = user.toObject();
        return userWithoutPassword;
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new InternalServerErrorException(
        'Failed to retrieve users',
        errorMessage,
      );
    }
  }

  async findById(id: string): Promise<UserResponse | null> {
    try {
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        throw new BadRequestException(`Invalid user ID format: ${id}`);
      }

      const user = await this.userModel.findById(id).exec();
      if (!user) {
        return null;
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = user.toObject();
      return {
        ...userWithoutPassword,
        _id: userWithoutPassword._id as string,
      } as UserResponse;
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new InternalServerErrorException(
        `Failed to find user with ID ${id}`,
        errorMessage,
      );
    }
  }

  async findbyIdWithPassword(
    id: string,
  ): Promise<UserDocument | null> {
    try {
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        throw new BadRequestException(`Invalid user ID format: ${id}`);
      }

      const user = await this.userModel.findById(id, '+password').exec();
      if (!user) {
        return null; // Return null if user not found
      }

      return user;
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new InternalServerErrorException(
        `Failed to find user with ID ${id}`,
        errorMessage,
      );
    }
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    try {
      const user = await this.userModel.findOne({ email }).exec();
      if (!user) {
        return null; // Return null if user not found
      }

      return user;
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new InternalServerErrorException(
        `Failed to find user with email ${email}`,
        errorMessage,
      );
    }
  }
  async findPasswordById(id: string): Promise<string | null> {
    try {
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        throw new BadRequestException(`Invalid user ID format: ${id}`);
      }

      const user = await this.userModel.findById(id, '+password').exec();
      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      return user.password;
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new InternalServerErrorException(
        `Failed to find password for user with ID ${id}`,
        errorMessage,
      );
    }
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<Omit<User, 'password'> | null> {
    try {
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        throw new BadRequestException(`Invalid user ID format: ${id}`);
      }
      //check if the request is to update the password
      if (updateUserDto.password) {
        const salt = await bcrypt.genSalt();
        updateUserDto.password = await bcrypt.hash(
          updateUserDto.password,
          salt,
        );
      }
      const user = await this.userModel
        .findByIdAndUpdate(id, updateUserDto, {
          new: true,
          runValidators: true,
        })
        .exec();
      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = user.toObject();
      return userWithoutPassword;
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      if (error instanceof MongooseError.ValidationError) {
        throw new BadRequestException(`Validation failed: ${error.message}`);
      }
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 11000
      ) {
        throw new ConflictException('A user with this email already exists');
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new InternalServerErrorException(
        `Failed to update user with ID ${id}`,
        errorMessage,
      );
    }
  }

  async remove(id: string): Promise<UserDocument | null> {
    try {
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        throw new BadRequestException(`Invalid user ID format: ${id}`);
      }

      const user = await this.userModel.findByIdAndDelete(id).exec();
      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      return user;
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new InternalServerErrorException(
        `Failed to delete user with ID ${id}`,
        errorMessage,
      );
    }
  }

  async updateUser(user: UserDocument): Promise<UserDocument> {
    try {
      return await user.save();
    } catch (error: unknown) {
      if (error instanceof MongooseError.ValidationError) {
        throw new BadRequestException(`Validation failed: ${error.message}`);
      }
      throw new InternalServerErrorException(
        'Failed to update user',
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
    }
  }

  async updateNotificationPreferences(
    userId: string,
    preferences: { push?: boolean; email?: boolean; sms?: boolean },
  ): Promise<UserDocument | null> {
    try {
      if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
        throw new BadRequestException(`Invalid user ID format: ${userId}`);
      }

      if (Object.keys(preferences).length === 0) {
        throw new BadRequestException(
          'No notification preferences provided for update',
        );
      }

      const updateFields = {};
      if (preferences.push !== undefined) {
        updateFields['notificationPreferences.push'] = preferences.push;
      }
      if (preferences.email !== undefined) {
        updateFields['notificationPreferences.email'] = preferences.email;
      }
      if (preferences.sms !== undefined) {
        updateFields['notificationPreferences.sms'] = preferences.sms;
      }

      const user = await this.userModel
        .findByIdAndUpdate(
          userId,
          { $set: updateFields },
          { new: true, runValidators: true },
        )
        .exec();

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      return user;
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new InternalServerErrorException(
        `Failed to update notification preferences for user with ID ${userId}`,
        errorMessage,
      );
    }
  }
}
