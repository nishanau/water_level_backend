import { IsNotEmpty, IsNumber, IsString, Min, Max } from 'class-validator';

export class IoTWaterLevelDto {
  @IsNotEmpty()
  @IsString()
  deviceId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(100)
  level: number;
}
