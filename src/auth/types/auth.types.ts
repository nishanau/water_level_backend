import { Types } from 'mongoose';

export interface UserResponse {
  _id: string | Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  notificationPreferences?: {
    push: boolean;
    email: boolean;
    sms: boolean;
  };
  tankIds?: string[] | Types.ObjectId[];
  orderIds?: string[] | Types.ObjectId[];
  notificationIds?: string[] | Types.ObjectId[];
  paymentMethodIds?: string[] | Types.ObjectId[];
}

export interface LoginResponse {
  user: UserResponse;
  access_token: string;
  refresh_token: string;
}

export interface ServiceArea {
  region: string;
  postalCodes: string[];
}

export interface PricingTier {
  minVolume: number;
  maxVolume: number;
  pricePerLiter: number;
}

export interface Review {
  userId: Types.ObjectId;
  rating: number;
  comment?: string;
  date: Date;
}

export interface SupplierResponse {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role: string;
  company?: string;
  logo?: string;
  serviceAreas: ServiceArea[];
  pricing: PricingTier[];
  avgResponseTime: number;
  rating: number;
  reviews: Review[];
  active: boolean;
}
export interface Payload {
  userId: string | Types.ObjectId;
  email: string;
  role: string;
}
