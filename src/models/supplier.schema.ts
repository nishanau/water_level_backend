import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

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
export class FileData {
  @Prop({ required: true })
  fileName: string;

  @Prop({ required: true })
  filePath: string;

  @Prop({ required: true })
  contentType: string;

  @Prop({ required: true })
  downloadURL: string;

  @Prop({ default: true })
  isPublic: boolean;

  @Prop({ default: Date.now })
  uploadedAt: Date;

  @Prop()
  size: number;
}

@Schema()
export class Supplier extends Document {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop()
  phoneNumber: string;

  @Prop({
    required: true,
    enum: ['supplier'],
    default: 'supplier',
  })
  role: string;

  @Prop()
  company: string;

  @Prop({ type: FileData })
  logo: FileData;

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
