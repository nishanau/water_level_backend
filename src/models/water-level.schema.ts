import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WaterLevelDocument = WaterLevel & Document;

@Schema({
  timeseries: {
    timeField: 'timestamp',
    metaField: 'tankId',
    granularity: 'minutes',
    expireAfterSeconds: 60 * 24 * 60 * 60, // Optional: expires after 60 days
  },
})
export class WaterLevel {
  @Prop({ required: true })
  tankId: string;

  @Prop({ required: true })
  level: number;

  @Prop({ required: true })
  volumeLiters: number;

  @Prop({ required: true })
  timestamp: Date;

  @Prop({ default: 'manual' })
  source?: string;
}

export const WaterLevelSchema = SchemaFactory.createForClass(WaterLevel);
