import { IsNotEmpty, IsDate, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class RescheduleOrderDto {
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  scheduledDeliveryDate: Date;

  @IsOptional()
  notes?: string;
}
