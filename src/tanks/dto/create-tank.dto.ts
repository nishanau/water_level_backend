import {
  IsNotEmpty,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsDate,
  IsMongoId,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTankDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  capacity: number;

  @IsOptional()
  @IsBoolean()
  @IsNumber()
  @Min(0)
  avgDailyUsage?: number;

  @IsNotEmpty()
  @IsNumber()
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
