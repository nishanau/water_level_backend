import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateNotificationPreferencesDto {
  @ApiProperty({
    description: 'Whether to receive push notifications',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  push?: boolean;

  @ApiProperty({
    description: 'Whether to receive email notifications',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  email?: boolean;

  @ApiProperty({
    description: 'Whether to receive SMS notifications',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  sms?: boolean;
}
