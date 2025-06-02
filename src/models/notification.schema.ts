import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from './user.schema';

export type NotificationDocument = Notification & Document;

@Schema()
export class RelatedTo {
  @Prop({ required: true, enum: ['order', 'tank', 'system'] })
  model: string;

  @Prop({ type: MongooseSchema.Types.ObjectId })
  id: MongooseSchema.Types.ObjectId;
}

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

  @Prop({ type: RelatedTo })
  relatedTo: RelatedTo;

  @Prop({ default: false })
  read: boolean;

  @Prop({ type: [String] })
  sentVia: string[];

  @Prop({ required: true, default: Date.now })
  createdAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
