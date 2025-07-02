import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class Address {
  @Prop()
  street: string;

  @Prop()
  street2: string;

  @Prop()
  city: string;

  @Prop()
  state: string;

  @Prop()
  postalCode: string;

  @Prop()
  country: string;

  @Prop({ type: { latitude: Number, longitude: Number } })
  coordinates: { latitude: number; longitude: number };
}

@Schema({ timestamps: true })
export class NotificationPreferences {
  @Prop({ default: true })
  push: boolean;

  @Prop({ default: true })
  email: boolean;

  @Prop({ default: false })
  sms: boolean;
}

@Schema({ timestamps: true })
export class Tanks {
  @Prop({ required: true })
  capacity: number;

  @Prop({ default: 0 })
  avgDailyUsage: number;

  @Prop({ required: true, min: 0, max: 100 })
  lowWaterThreshold: number;

  @Prop({ required: true })
  deviceId: string;

  @Prop()
  lastReadingDate: Date;

  @Prop()
  lastReadingValue: number;
}

@Schema({ timestamps: true })
export class User {
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
    enum: ['customer', 'supplier', 'admin'],
    default: 'customer',
  })
  role: string;

  @Prop({ type: Address })
  address: Address;

  @Prop({ default: false })
  autoOrder: boolean;

  @Prop({ type: NotificationPreferences, default: {} })
  notificationPreferences: NotificationPreferences;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Supplier' })
  preferredSupplier: MongooseSchema.Types.ObjectId;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop()
  emailVerificationToken: string;

  @Prop()
  resetPasswordCode: string;

  @Prop()
  resetPasswordCodeExpiry: Date;

  @Prop({ type: [Tanks] })
  tanks: Tanks[];
}

export const UserSchema = SchemaFactory.createForClass(User);

// Add post-compile hooks to ensure document has methods
UserSchema.set('toObject', { virtuals: true });
UserSchema.set('toJSON', { virtuals: true });
