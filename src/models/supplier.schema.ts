import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User, UserSchema } from './user.schema';

export type SupplierDocument = Supplier & Document;

@Schema()
export class ServiceArea {
  @Prop({ required: true })
  region: string;

  @Prop({ type: [String] })
  postalCodes: string[];
}

@Schema()
export class PricingTier {
  @Prop({ required: true })
  minVolume: number;

  @Prop({ required: true })
  maxVolume: number;

  @Prop({ required: true })
  pricePerLiter: number;
}

@Schema()
export class Review {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop()
  comment: string;

  @Prop({ default: Date.now })
  date: Date;
}

@Schema()
export class Supplier extends User {
  @Prop()
  company: string;

  @Prop()
  logo: string;

  @Prop({ type: [ServiceArea], default: [] })
  serviceAreas: ServiceArea[];

  @Prop({ type: [PricingTier], default: [] })
  pricing: PricingTier[];

  @Prop({ default: 0 })
  avgResponseTime: number;

  @Prop({ default: 0, min: 0, max: 5 })
  rating: number;

  @Prop({ type: [Review], default: [] })
  reviews: Review[];

  @Prop({ default: true })
  active: boolean;
}

export const SupplierSchema = SchemaFactory.createForClass(Supplier);

// Add all fields from UserSchema
SupplierSchema.add(UserSchema);
