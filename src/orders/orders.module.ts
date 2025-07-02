import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order, OrderSchema } from '../models/order.schema';
import { TanksModule } from '../tanks/tanks.module';
import { UsersModule } from '../users/users.module';
import { SuppliersModule } from '../suppliers/suppliers.module'; // Importing SuppliersModule
import { Supplier } from 'src/models';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    TanksModule,
    UsersModule,
    SuppliersModule, // Assuming you have a SuppliersModule for supplier-related operations
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
