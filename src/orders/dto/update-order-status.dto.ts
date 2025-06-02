import { IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsNotEmpty()
  @IsEnum([
    'placed',
    'acknowledged',
    'scheduled',
    'in_transit',
    'delivered',
    'cancelled',
  ])
  status: string;

  @IsOptional()
  notes?: string;
}
