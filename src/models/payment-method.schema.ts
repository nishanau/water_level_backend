import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from './user.schema';

export type PaymentMethodDocument = PaymentMethod & Document;

@Schema({ timestamps: true })
export class PaymentMethod {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: User;

  @Prop({ required: true })
  paymentProviderType: string; // 'stripe', 'paypal', etc.

  @Prop({ required: true })
  paymentProviderId: string; // Token/ID from the payment provider

  @Prop()
  lastFour: string; // Last four digits of card for display purposes

  @Prop()
  cardType: string; // Visa, Mastercard, etc.

  @Prop()
  expiryMonth: number;

  @Prop()
  expiryYear: number;

  @Prop()
  billingAddressId: string; // Reference to a stored address

  @Prop({ default: false })
  isDefault: boolean;

  @Prop({ default: true })
  isActive: boolean;
}

export const PaymentMethodSchema = SchemaFactory.createForClass(PaymentMethod);
