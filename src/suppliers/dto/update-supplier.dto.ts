import {
  IsNumber,
  IsString,
  IsBoolean,
  IsOptional,
  IsEmail,
  IsArray,
  Min,
  Max,
  ValidateNested,
  MinLength,
  IsDateString,
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

  @IsDateString()
  @IsOptional()
  uploadedAt?: Date;

  @IsNumber()
  @IsOptional()
  size?: number;
}

// Service area configuration for update
export class UpdateServiceAreaDto {
  @IsString()
  @IsOptional()
  region?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  postalCodes?: string[];
}

// Pricing tier configuration for update
export class UpdatePricingTierDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  minVolume?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  maxVolume?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  pricePerLiter?: number;
}

// Main update DTO - NOT extending CreateSupplierDto
export class UpdateSupplierDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  currentPassword?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  company?: string;

  @ValidateNested()
  @IsOptional()
  @Type(() => FileDataDto)
  logo?: FileDataDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateServiceAreaDto)
  @IsOptional()
  serviceAreas?: UpdateServiceAreaDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdatePricingTierDto)
  @IsOptional()
  pricing?: UpdatePricingTierDto[];

  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  rating?: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
