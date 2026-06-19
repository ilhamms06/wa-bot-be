import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateBotNumberDto {
  @ApiProperty({
    description: 'Bot phone number (e.g. 628123456789)',
    example: '628123456789',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10,15}$/, {
    message: 'phoneNumber must be 10-15 digits',
  })
  phoneNumber: string;

  @ApiPropertyOptional({
    description: 'Optional label/name for this bot number',
    example: 'Nutrition Bot',
  })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({
    description: 'Mark this number as the active bot immediately',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
