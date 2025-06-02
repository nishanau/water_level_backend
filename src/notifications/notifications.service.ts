import { Injectable, NotFoundException } from '@nestjs/common';
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
    createNotificationDto: CreateNotificationDto,
  ): Promise<NotificationDocument> {
    const notification = new this.notificationModel(createNotificationDto);
    return notification.save();
  }

  async findAllForUser(userId: string): Promise<NotificationDocument[]> {
    return this.notificationModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .exec();
  }
  async markAsRead(id: string, userId: string): Promise<NotificationDocument> {
    const notification = await this.notificationModel
      .findOneAndUpdate({ _id: id, userId }, { read: true }, { new: true })
      .exec();

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    return notification;
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationModel
      .updateMany({ userId, read: false }, { read: true })
      .exec();
  }

  // Method to create notification for low water level
  async createLowWaterLevelNotification(
    userId: string,
    tankId: string,
    level: number,
  ): Promise<NotificationDocument> {
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

    return notification.save();
  }

  // Method to create notification for order status changes
  async createOrderStatusNotification(
    userId: string,
    orderId: string,
    status: string,
  ): Promise<NotificationDocument> {
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

    return notification.save();
  }
}
