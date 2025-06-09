import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from './user.schema';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: User;

  @Prop({
    required: true,
    enum: ['warning', 'order', 'delivery', 'cancel', 'reschedule', 'system'],
  })
  type: string;

  @Prop({ required: true })
  message: string;

  @Prop({
    enum: ['order', 'tank', 'system', 'payment', 'users'],
    required: true,
  })
  relatedTo: string;

  @Prop({ default: false })
  read: boolean;

  @Prop({ type: [String] })
  sentVia: string[];

  @Prop({ required: true, default: Date.now })
  createdAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
