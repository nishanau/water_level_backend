import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Tank } from './tank.schema';

export type WaterLevelDocument = WaterLevel & Document;

@Schema({ timestamps: true })
export class WaterLevel {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Tank', required: true })
  tankId: Tank;

  @Prop({ required: true })
  level: number;

  @Prop({ required: true })
  volumeLiters: number;

  @Prop({ required: true, default: Date.now })
  timestamp: Date;

  @Prop({ required: true, enum: ['sensor', 'manual', 'estimated'], default: 'sensor' })
  source: string;
}

export const WaterLevelSchema = SchemaFactory.createForClass(WaterLevel);
