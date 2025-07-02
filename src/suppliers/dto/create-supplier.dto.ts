import {
  IsString,
  IsEmail,
  IsOptional,
  ValidateNested,
  IsNumber,
  IsArray,
  Min,
  IsBoolean,
  MinLength,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

// File data for logo storage
export class FileDataDto {
  @IsString()
  @IsOptional()
  fileName?: string;

  @IsString()
  @IsOptional()
  filePath?: string;

  @IsString()
  @IsOptional()
  contentType?: string;

  @IsString()
  @IsOptional()
  downloadURL?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsString()
  @IsOptional()
  uploadedAt?: Date;

  @IsNumber()
  @IsOptional()
  size?: number;
}

// Service area configuration
export class ServiceAreaDto {
  @IsString()
  region: string;

  @IsArray()
  @IsString({ each: true })
  postalCodes?: string[];
}

// Pricing tier configuration
export class PricingTierDto {
  @IsNumber()
  @Min(0)
  minVolume: number;

  @IsNumber()
  @Min(0)
  maxVolume: number;

  @IsNumber()
  @Min(0)
  pricePerLiter: number;
}

export class SupplierAddressDto {
  @IsString()
  street1?: string;

  @IsString()
  @IsOptional()
  street2?: string;

  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsString()
  postalCode: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsObject()
  @IsOptional()
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export class CreateSupplierDto {
  @IsString()
  @IsOptional()
  firstName: string;

  @IsString()
  @IsOptional()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  phoneNumber: string;

  @IsString()
  company: string;

  @ValidateNested()
  @IsOptional()
  @Type(() => FileDataDto)
  logo?: FileDataDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceAreaDto)
  serviceAreas?: ServiceAreaDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PricingTierDto)
  pricing?: PricingTierDto[];

  @IsNumber()
  @IsOptional()
  @Min(0)
  avgResponseTime?: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsString()
  role: string;

  @ValidateNested()
  @IsOptional()
  @Type(() => SupplierAddressDto)
  address?: SupplierAddressDto;
}
