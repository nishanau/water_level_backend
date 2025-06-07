import { IsString, IsEmail, IsOptional, ValidateNested, IsNumber, IsArray, Min, Max, ArrayMinSize, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class ServiceAreaDto {
  @IsString()
  region: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  postalCodes: string[];
}

export class PricingTierDto {
  @IsNumber()
  minVolume: number;

  @IsNumber()
  maxVolume: number;

  @IsNumber()
  pricePerLiter: number;
}

export class CreateSupplierDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  company: string;

  @IsString()
  @IsOptional()
  logo?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceAreaDto)
  @IsOptional()
  serviceAreas?: ServiceAreaDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PricingTierDto)
  @IsOptional()
  pricing?: PricingTierDto[];

  @IsNumber()
  @IsOptional()
  @Min(0)
  avgResponseTime?: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
