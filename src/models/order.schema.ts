import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Tank } from './tank.schema';
import { User } from './user.schema';

export type OrderDocument = Order & Document;

@Schema()
export class StatusHistory {
  @Prop({ required: true })
  status: string;

  @Prop({ required: true, default: Date.now })
  timestamp: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  updatedBy: User;

  @Prop()
  notes: string;
}

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true, unique: true })
  orderNumber: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Tank', required: true })
  tankId: Tank;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  supplierId: User;

  @Prop({ required: true, default: Date.now })
  orderDate: Date;

  @Prop({ type: Date })
  requestedDeliveryDate: Date;

  @Prop({ type: Date })
  scheduledDeliveryDate: Date;

  @Prop({ type: Date })
  actualDeliveryDate: Date;

  @Prop({
    required: true,
    enum: [
      'placed',
      'acknowledged',
      'scheduled',
      'in_transit',
      'delivered',
      'cancelled',
    ],
    default: 'placed',
  })
  status: string;

  @Prop({ type: [StatusHistory], default: [] })
  statusHistory: StatusHistory[];

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  price: number;

  @Prop()
  invoiceNumber: string;

  @Prop({
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
  })
  paymentStatus: string;

  @Prop()
  deliveryNotes: string;

  @Prop()
  customerSignature: string;

  @Prop()
  driverNotes: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
