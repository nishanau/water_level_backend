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
import { Types } from 'mongoose';
import { randomBytes } from 'crypto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  /**
   * Creates a new user in the database
   *
   * @param createUserDto - Data transfer object containing user information
   * @returns A user response object with sensitive fields removed
   * @throws BadRequestException if validation fails or email already exists
   * @throws InternalServerErrorException if database operation fails
   */
  async create(createUserDto: CreateUserDto): Promise<UserResponse> {
    try {
      const newUser = new this.userModel(createUserDto);
      const verificationToken = randomBytes(32).toString('hex');
      newUser.emailVerificationToken = verificationToken;
      const savedUser = await newUser.save();

      // Properly transform to UserResponse type by explicitly excluding sensitive fields
      const userObject = savedUser.toObject();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userResponse } = userObject;

      return {
        ...userResponse,
        _id: (savedUser._id as Types.ObjectId).toString(),
      };
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

  /**
   * Retrieves all users from the database
   *
   * @returns Array of users with passwords excluded
   * @throws InternalServerErrorException if database operation fails
   */
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

  /**
   * Finds a user by their MongoDB ID
   *
   * @param id - MongoDB ObjectId as string
   * @returns The user if found (with password excluded) or null if not found
   * @throws BadRequestException if the ID format is invalid
   * @throws InternalServerErrorException if database operation fails
   */
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

  /**
   * Finds a user by ID and includes the password field
   *
   * This method is primarily used for authentication purposes.
   * The password field is normally excluded from queries.
   *
   * @param id - MongoDB ObjectId as string
   * @returns The user document including password if found, null otherwise
   * @throws BadRequestException if the ID format is invalid
   * @throws InternalServerErrorException if database operation fails
   */
  async findbyIdWithPassword(id: string): Promise<UserDocument | null> {
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

  /**
   * Finds a user by their email address
   *
   * @param email - The email address to search for
   * @returns The user document if found, or null if no user exists with the given email
   * @throws InternalServerErrorException if database operation fails
   */
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

  /**
   * Retrieves a user's password by their ID
   *
   * This method explicitly includes the password field which is normally excluded from queries.
   * It should only be used for authentication purposes.
   *
   * @param id - The MongoDB ID of the user
   * @returns The user's hashed password if found, or null if user doesn't exist
   * @throws BadRequestException if the ID format is invalid
   * @throws NotFoundException if no user with the given ID exists
   * @throws InternalServerErrorException if database operation fails
   */
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

  /**
   * Updates a user's information
   *
   * If the update includes a password, it will be hashed before storage.
   *
   * @param id - MongoDB ObjectId as string
   * @param updateUserDto - Partial user object with fields to update
   * @returns Updated user object with password excluded
   * @throws BadRequestException if validation fails or ID format is invalid
   * @throws NotFoundException if user is not found
   * @throws ConflictException if update would create a duplicate email
   * @throws InternalServerErrorException if database operation fails
   */
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

  /**
   * Removes a user from the database
   *
   * @param id - MongoDB ObjectId as string
   * @returns The deleted user document or null if not found
   * @throws BadRequestException if the ID format is invalid
   * @throws NotFoundException if user is not found
   * @throws InternalServerErrorException if database operation fails
   */
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

  /**
   * Saves changes to an existing user document
   *
   * This method is used when you already have a user document that has been modified
   * and needs to be persisted to the database.
   *
   * @param user - The user document to save
   * @returns The saved user document
   * @throws BadRequestException if validation fails
   * @throws InternalServerErrorException if database operation fails
   */
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

  /**
   * Updates a user's notification preferences
   *
   * Allows updating one or more notification settings (push, email, SMS).
   * Only the provided preferences will be updated; others remain unchanged.
   *
   * @param userId - MongoDB ObjectId as string
   * @param preferences - Object containing notification preferences to update
   * @returns The updated user document
   * @throws BadRequestException if ID format is invalid or no preferences provided
   * @throws NotFoundException if user is not found
   * @throws InternalServerErrorException if database operation fails
   */
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
