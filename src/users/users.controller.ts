import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { UpdateNotificationPreferencesDto } from '../notifications/dto/update-notification-preferences.dto';

/**
 * Users Controller
 *
 * Handles HTTP requests related to user management including:
 * - User creation (admin only)
 * - Retrieving user information
 * - Updating user profiles
 * - Managing notification preferences
 * - Deleting users (admin only)
 */
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Creates a new user
   *
   * This endpoint is restricted to administrators only.
   *
   * @param createUserDto - Data for the new user
   * @returns The created user object
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  /**
   * Retrieves all users in the system
   *
   * This endpoint is restricted to administrators only.
   *
   * @returns Array of all users with sensitive fields excluded
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  /**
   * Retrieves a specific user by ID
   *
   * Users can only access their own data unless they have admin privileges.
   *
   * @param id - The MongoDB ID of the user to retrieve
   * @returns The user data if found
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  /**
   * Updates the current user's profile
   *
   * Users can only update their own profile information.
   *
   * @param req - The request object containing authenticated user ID
   * @param updateUserDto - Fields to update in the user profile
   * @returns The updated user profile
   */
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateProfile(
    @Request() req: Request & { user: { userId: string } },
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(req.user.userId, updateUserDto);
  }

  /**
   * Updates the current user's notification preferences
   *
   * Users can enable or disable different notification channels (push, email, SMS).
   *
   * @param req - The request object containing authenticated user ID
   * @param updateNotificationPreferencesDto - New notification preference settings
   * @returns Updated user object with new notification preferences
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('notification-preferences')
  @ApiOperation({ summary: 'Update user notification preferences' })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences updated successfully',
  })
  updateNotificationPreferences(
    @Request() req: Request & { user: { userId: string } },
    @Body() updateNotificationPreferencesDto: UpdateNotificationPreferencesDto,
  ) {
    return this.usersService.updateNotificationPreferences(
      req.user.userId,
      updateNotificationPreferencesDto,
    );
  }

  /**
   * Updates a specific user by ID
   *
   * This endpoint is restricted to administrators or the user themselves.
   *
   * @param id - The MongoDB ID of the user to update
   * @param updateUserDto - Fields to update in the user profile
   * @returns The updated user profile
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  /**
   * Removes a user from the system
   *
   * This endpoint is restricted to administrators only.
   *
   * @param id - The MongoDB ID of the user to remove
   * @returns The deleted user data
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
