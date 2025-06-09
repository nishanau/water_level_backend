import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Notification,
  NotificationDocument,
} from '../models/notification.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
  ) {}

  async create(
    notificationData: CreateNotificationDto,
    // Assuming 'data' is not used in this method, you can remove it if unnecessary
  ): Promise<NotificationDocument> {
    try {
      const notification = new this.notificationModel(notificationData);
      return await notification.save();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new InternalServerErrorException(
        'Failed to create notification',
        errorMessage,
      );
    }
  }

  async findAllForUser(userId: string): Promise<NotificationDocument[]> {
    try {
      return await this.notificationModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .exec();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new InternalServerErrorException(
        'Failed to find notifications for user',
        errorMessage,
      );
    }
  }

  async markAsRead(id: string, userId: string): Promise<NotificationDocument> {
    try {
      const notification = await this.notificationModel
        .findOneAndUpdate({ _id: id, userId }, { read: true }, { new: true })
        .exec();

      if (!notification) {
        throw new NotFoundException(`Notification with ID ${id} not found`);
      }

      return notification;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new InternalServerErrorException(
        'Failed to mark notification as read',
        errorMessage,
      );
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    try {
      await this.notificationModel
        .updateMany({ userId, read: false }, { read: true })
        .exec();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new InternalServerErrorException(
        'Failed to mark all notifications as read',
        errorMessage,
      );
    }
  }

  // Method to create notification for low water level
  async createLowWaterLevelNotification(
    userId: string,
    tankId: string,
    level: number,
  ): Promise<NotificationDocument> {
    try {
      const notification = new this.notificationModel({
        userId,
        type: 'warning',
        message: `Your water tank level is low (${level}%). Consider placing an order.`,
        relatedTo: {
          model: 'tank',
          id: tankId,
        },
        read: false,
        sentVia: ['push', 'email'],
      });

      return await notification.save();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new InternalServerErrorException(
        'Failed to create low water level notification',
        errorMessage,
      );
    }
  }

  // Method to create notification for order status changes
  async createOrderStatusNotification(
    userId: string,
    orderId: string,
    status: string,
  ): Promise<NotificationDocument> {
    try {
      const notification = new this.notificationModel({
        userId,
        type: 'order',
        message: `Your order status has been updated to: ${status}`,
        relatedTo: {
          model: 'order',
          id: orderId,
        },
        read: false,
        sentVia: ['push'],
      });

      return await notification.save();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new InternalServerErrorException(
        'Failed to create order status notification',
        errorMessage,
      );
    }
  }
}
