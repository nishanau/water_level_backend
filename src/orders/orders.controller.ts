import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { RescheduleOrderDto } from './dto/reschedule-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsersService } from '../users/users.service';
import { SuppliersService } from '../suppliers/suppliers.service';
import { Types } from 'mongoose';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly userService: UsersService,
    private readonly suppliersService: SuppliersService,
  ) {}

  @Post()
  create(@Body() createOrderDto: CreateOrderDto, @Req() req) {
    return this.ordersService.create(createOrderDto, req.user.userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Req() req, @Res({ passthrough: true }) res: Response) {
    const orders = await this.ordersService.findAll(
      req.user.userId,
      req.user.role,
    );
    if (req.user.role === 'supplier') {
      const userIds = [
        ...new Set(orders.map((order) => order.userId.toString())),
      ];
      const customerResponse = await Promise.allSettled(
        userIds.map((userId) => this.userService.findById(userId)),
      );
      const customers = customerResponse
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value);
      // Build a map for quick lookup (userId -> customer)
      const customerMap = new Map(
        customers
          .filter((customer) => customer !== null)
          .map((customer) => [customer._id.toString(), customer]),
      );

      // Combine each order with its customer details
      const orderResponse = orders.map((order) => ({
        ...order,
        customer: customerMap.get(order.userId.toString()) || null,
      }));

      console.log('Order Response for supplier', orderResponse);

      return orderResponse;
    } else if (req.user.role === 'customer') {
      // Get unique supplierIds from orders
      const supplierIds = [
        ...new Set(orders.map((order) => order.supplierId?.toString())),
      ].filter(Boolean);

      // Fetch supplier details using findOne (returns lean object, no password)
      const supplierResponses = await Promise.allSettled(
        supplierIds.map((supplierId) =>
          this.suppliersService.findOne(supplierId),
        ),
      );
      const suppliers = supplierResponses
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value);

      // Build a map for quick lookup (supplierId -> supplier)
      const supplierMap = new Map(
        suppliers
          .filter((supplier) => supplier !== null)
          .map((supplier) => [
            typeof supplier._id === 'string'
              ? supplier._id
              : (supplier._id as Types.ObjectId).toString(),
            supplier,
          ]),
      );
      // Combine each order with its supplier details
      const orderResponse = orders.map((order) => ({
        ...order,
        supplier:
          supplierMap.get(
            typeof order.supplierId === 'string'
              ? order.supplierId
              : order.supplierId.toString(),
          ) || null,
      }));

      return orderResponse;
    }
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req) {
    return this.ordersService.findOne(id, req.user.userId, req.user.role);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('supplier', 'admin')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateFields: Record<string, any>,
    @Req() req,
  ) {
    return this.ordersService.updateAnyField(
      id,
      updateFields,
      req.user.userId,
      req.user.role,
    );
  }

  @Patch(':id/cancel')
  cancelOrder(@Param('id') id: string, @Req() req) {
    return this.ordersService.cancel(id, req.user.userId);
  }

  @Patch(':id/reschedule')
  rescheduleOrder(
    @Param('id') id: string,
    @Body() rescheduleOrderDto: RescheduleOrderDto,
    @Req() req,
  ) {
    return this.ordersService.reschedule(
      id,
      rescheduleOrderDto.scheduledDeliveryDate,
      rescheduleOrderDto.notes,
      req.user.userId,
    );
  }
}
