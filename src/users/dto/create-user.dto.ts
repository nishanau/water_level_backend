import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
  ValidateNested,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  IsDate,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class AddressDto {
  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  street2?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export class NotificationPreferencesDto {
  @IsOptional()
  push?: boolean;

  @IsOptional()
  email?: boolean;

  @IsOptional()
  sms?: boolean;
}

export class TanksDto {
  @IsNotEmpty()
  @Min(0)
  capacity: number;

  @IsOptional()
  @IsBoolean()
  @Min(0)
  avgDailyUsage?: number;

  @IsNotEmpty()
  @Min(0)
  @Max(100)
  lowWaterThreshold?: number;

  @IsNotEmpty()
  deviceId: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  installedDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  lastMaintenance?: Date;

  @IsOptional()
  @IsNumber()
  currentWaterLevel: number;
}

export class CreateUserDto {
  @Transform(({ value }: { value: string }) => value.trim())
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @Transform(({ value }: { value: string }) => value.trim())
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @Transform(({ value }: { value: string }) => value.trim().toLowerCase())
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value.trim())
  phoneNumber: string;

  @IsOptional()
  @IsEnum(['customer', 'supplier', 'admin'])
  role?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferencesDto)
  notificationPreferences?: NotificationPreferencesDto;

  @IsOptional()
  autoOrder?: boolean;

  @IsOptional()
  preferredSupplier?: string;

  @IsOptional()
  tanks?: TanksDto[];
}
