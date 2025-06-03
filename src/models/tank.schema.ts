import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from './user.schema';

export type TankDocument = Tank & Document;

@Schema({ timestamps: true })
export class Tank {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: User;

  @Prop({ required: true })
  capacity: number;

  @Prop({ default: 0 })
  avgDailyUsage: number;

  @Prop({ default: 20 })
  lowWaterThreshold: number;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  preferredSupplier: User;

  @Prop({ required: true })
  deviceId: string;

  @Prop({ type: Date })
  installedDate: Date;

  @Prop({ type: Date })
  lastMaintenance: Date;

  @Prop({ default: 0 })
  currentWaterLevel: number;
}

export const TankSchema = SchemaFactory.createForClass(Tank);
