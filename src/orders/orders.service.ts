import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument, StatusHistory } from '../models/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { TanksService } from '../tanks/tanks.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private tanksService: TanksService,
    private usersService: UsersService,
  ) {}

  async create(
    createOrderDto: CreateOrderDto,
    userId: string,
  ): Promise<OrderDocument> {
    // Generate order number
    const orderCount = await this.orderModel.countDocuments();
    const orderNumber = `WO-${String(orderCount + 1).padStart(4, '0')}`;

    // Create initial status history
    const statusHistory = [
      {
        status: 'placed',
        timestamp: new Date(),
        notes: 'Order placed by customer',
      },
    ];

    // Create the order
    const newOrder = new this.orderModel({
      ...createOrderDto,
      userId,
      orderNumber,
      status: 'placed',
      statusHistory,
      orderDate: new Date(),
    });

    return newOrder.save();
  }

  async findAll(userId: string, role: string): Promise<OrderDocument[]> {
    // If admin, can view all orders
    if (role === 'admin') {
      return this.orderModel.find().sort({ orderDate: -1 }).exec();
    }

    // If supplier, can view orders assigned to them
    if (role === 'supplier') {
      return this.orderModel
        .find({ supplierId: userId })
        .sort({ orderDate: -1 })
        .exec();
    }

    // Otherwise, users can only view their own orders
    return this.orderModel.find({ userId }).sort({ orderDate: -1 }).exec();
  }

  async findOne(
    id: string,
    userId: string,
    role: string,
  ): Promise<OrderDocument> {
    const order = await this.orderModel.findById(id).exec();

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    // Check if user has permission to access this order
    let orderUserId = '';
    let orderSupplierId = '';

    if (order.userId) {
      if (order.userId instanceof Types.ObjectId) {
        orderUserId = order.userId.toString();
      } else if (typeof order.userId === 'string') {
        orderUserId = order.userId;
      } else {
        try {
          // Try to safely get ID if it's a document
          orderUserId = String(order.userId);
        } catch (error) {
          // If conversion fails, use empty string
          orderUserId = '';
        }
      }
    }

    if (order.supplierId) {
      if (order.supplierId instanceof Types.ObjectId) {
        orderSupplierId = order.supplierId.toString();
      } else if (typeof order.supplierId === 'string') {
        orderSupplierId = order.supplierId;
      } else {
        try {
          // Try to safely get ID if it's a document
          orderSupplierId = String(order.supplierId);
        } catch (error) {
          // If conversion fails, use empty string
          orderSupplierId = '';
        }
      }
    }

    if (
      role !== 'admin' &&
      orderUserId !== userId &&
      (role !== 'supplier' || orderSupplierId !== userId)
    ) {
      throw new ForbiddenException(
        'You do not have permission to access this order',
      );
    }

    return order;
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdateOrderStatusDto,
    userId: string,
    role: string,
  ): Promise<OrderDocument> {
    const order = await this.findOne(id, userId, role);

    // Only suppliers and admins can update order status
    if (role !== 'admin' && role !== 'supplier') {
      throw new ForbiddenException(
        'Only suppliers and admins can update order status',
      );
    }

    // Update status safely
    if (updateStatusDto && typeof updateStatusDto.status === 'string') {
      order.status = updateStatusDto.status;

      // Create a status history entry
      const statusHistoryEntry: Partial<StatusHistory> = {
        status: updateStatusDto.status,
        timestamp: new Date(),
        notes:
          updateStatusDto.notes ||
          `Status updated to ${updateStatusDto.status}`,
      };

      // Convert userId string to ObjectId for the updatedBy field
      if (userId) {
        statusHistoryEntry.updatedBy = new Types.ObjectId(userId) as any;
      }
      // Add to status history - safely casting with proper type checks
      order.statusHistory.push(statusHistoryEntry as StatusHistory);

      // If status is 'delivered', set actual delivery date
      if (updateStatusDto.status === 'delivered') {
        order.actualDeliveryDate = new Date();
      }
    }

    return order.save();
  }

  async cancel(
    id: string,
    notes: string | undefined,
    userId: string,
  ): Promise<OrderDocument> {
    const order = await this.findOne(id, userId, 'customer');

    // Can only cancel if not already cancelled or delivered
    if (['cancelled', 'delivered'].includes(order.status)) {
      throw new ForbiddenException(
        `Cannot cancel order with status: ${order.status}`,
      );
    }

    // Update status
    order.status = 'cancelled';

    // Create a status history entry
    const statusHistoryEntry: Partial<StatusHistory> = {
      status: 'cancelled',
      timestamp: new Date(),
      notes: notes || 'Cancelled by customer',
    };
    // Convert userId string to ObjectId for the updatedBy field
    if (userId) {
      statusHistoryEntry.updatedBy = new Types.ObjectId(userId) as any;
    }

    // Add to status history - safely casting with proper type checks
    order.statusHistory.push(statusHistoryEntry as StatusHistory);

    return order.save();
  }

  async reschedule(
    id: string,
    scheduledDate: Date,
    notes: string | undefined,
    userId: string,
  ): Promise<OrderDocument> {
    const order = await this.findOne(id, userId, 'customer');

    // Can only reschedule if not cancelled or delivered
    if (['cancelled', 'delivered'].includes(order.status)) {
      throw new ForbiddenException(
        `Cannot reschedule order with status: ${order.status}`,
      );
    }

    // Upate scheduled delivery date
    order.scheduledDeliveryDate = scheduledDate;

    // Create a status history entry
    const statusHistoryEntry: Partial<StatusHistory> = {
      status: 'rescheduled',
      timestamp: new Date(),
      notes: notes || 'Rescheduled by customer',
    };

    // Convert userId string to ObjectId for the updatedBy field
    if (userId) {
      statusHistoryEntry.updatedBy = new Types.ObjectId(userId) as any;
    }

    // Add to status history - safely casting with proper type checks
    order.statusHistory.push(statusHistoryEntry as StatusHistory);

    return order.save();
  }
}
