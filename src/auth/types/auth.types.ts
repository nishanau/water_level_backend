import { Types } from 'mongoose';
import { User } from '../../models/user.schema';
import { Supplier } from '../../models/supplier.schema';

/**
 * User response type for API responses
 *
 * Extends the User model but:
 * - Excludes sensitive fields like password
 * - Adds references to related entities like tanks and orders
 * - Ensures the _id field is properly typed
 */
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

/**
 * Supplier response type for API responses
 *
 * Extends the Supplier model but:
 * - Excludes sensitive fields like password
 * - Ensures the _id field is properly typed
 */
export type SupplierResponse = Omit<
  Supplier & { _id: string | Types.ObjectId },
  'password'
>;

/**
 * Response structure for successful login
 */
export type LoginResponse = {
  access_token: string;
  refresh_token: string;
  user: UserResponse | SupplierResponse;
};

/**
 * Response structure for registration operations
 */
export type RegisterResponse = {
  success: boolean;
  message: string;
};

/**
 * JWT token payload structure
 */
export interface Payload {
  userId: string | Types.ObjectId;
  email: string;
  role: string;
}
