import {
  IsNotEmpty,
  IsNumber,
  IsMongoId,
  IsOptional,
  IsDate,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderDto {
  @IsMongoId()
  @IsNotEmpty()
  tankId: string;

  @IsMongoId()
  @IsNotEmpty()
  supplierId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  scheduledDeliveryDate?: Date;

  @IsOptional()
  deliveryNotes?: string;
}
