import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  IsMongoId,
  Min,
  Max,
} from 'class-validator';

export class CreateWaterLevelDto {
  @IsMongoId()
  tankId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(100)
  level: number;

  @IsOptional()
  @IsEnum(['sensor', 'manual', 'estimated'])
  source?: string;
}
