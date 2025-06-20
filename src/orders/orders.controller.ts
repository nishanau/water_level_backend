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
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { RescheduleOrderDto } from './dto/reschedule-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() createOrderDto: CreateOrderDto, @Req() req) {
    return this.ordersService.create(createOrderDto, req.user.userId);
  }

  @Get()
  findAll(@Req() req, @Res({ passthrough: true }) res: Response,) {
    
    return this.ordersService.findAll(req.user.userId, req.user.role);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req) {
    return this.ordersService.findOne(id, req.user.userId, req.user.role);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('supplier', 'admin')
  updateStatus(
    @Param('id') id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
    @Req() req,
  ) {
    return this.ordersService.updateStatus(
      id,
      updateOrderStatusDto,
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
