import { IsOptional } from 'class-validator';

export class CancelOrderDto {
  @IsOptional()
  notes?: string;
}
