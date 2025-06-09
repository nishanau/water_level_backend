import {
  IsNotEmpty,
  IsEnum,
  IsMongoId,
  IsString,
  IsOptional,
} from 'class-validator';

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

  @IsNotEmpty()
  @IsEnum(['order', 'tank', 'system', 'payment', 'users'])
  relatedTo?: string;

  @IsOptional()
  read?: boolean;

  @IsOptional()
  sentVia?: string[];
}
