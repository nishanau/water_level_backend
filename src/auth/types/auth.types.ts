import { Types } from 'mongoose';
import { User } from '../../models/user.schema';
import { Supplier } from '../../models/supplier.schema';

// Create UserResponse by extending User and omitting sensitive fields
export type UserResponse = Omit<
  User & { _id: string | Types.ObjectId },
  'password'
> & {
  // Add references to related collections
  tankIds?: string[] | Types.ObjectId[];
  orderIds?: string[] | Types.ObjectId[];
  notificationIds?: string[] | Types.ObjectId[];
  paymentMethodIds?: string[] | Types.ObjectId[];
};

// Create SupplierResponse by extending Supplier and omitting sensitive fields
export type SupplierResponse = Omit<
  Supplier & { _id: string | Types.ObjectId },
  'password'
>;

export type LoginResponse = {
  access_token: string;
  refresh_token: string;
  user: UserResponse | SupplierResponse;
};
export type RegisterResponse = {
  success: boolean;
  message: string;
};

export interface Payload {
  userId: string | Types.ObjectId;
  email: string;
  role: string;
}
