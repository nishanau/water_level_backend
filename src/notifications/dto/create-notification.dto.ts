import {
  IsNotEmpty,
  IsEnum,
  IsMongoId,
  IsString,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RelatedToDto {
  @IsEnum(['order', 'tank', 'system'])
  model: string;

  @IsMongoId()
  id: string;
}

export class CreateNotificationDto {
  @IsNotEmpty()
  @IsMongoId()
  userId: string;

  @IsNotEmpty()
  @IsEnum(['warning', 'order', 'delivery', 'cancel', 'reschedule', 'system'])
  type: string;

  @IsNotEmpty()
  @IsString()
  message: string;

  @IsOptional()
  @Type(() => RelatedToDto)
  relatedTo?: RelatedToDto;

  @IsOptional()
  read?: boolean;

  @IsOptional()
  sentVia?: string[];
}
