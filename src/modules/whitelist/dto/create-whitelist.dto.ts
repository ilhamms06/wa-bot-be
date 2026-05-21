import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateWhitelistDto {
  @ApiProperty({
    description:
      'Phone number (e.g. 628123456789) or group JID (e.g. 120363xxx@g.us)',
    example: '628123456789',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(\d{10,15}|\d+@g\.us)$/, {
    message:
      'phoneNumber must be 10-15 digits, or a group JID (e.g. 120363xxx@g.us)',
  })
  phoneNumber: string;

  @ApiPropertyOptional({
    description: 'Optional label/name for this number',
    example: 'Customer Support',
  })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({
    description:
      'Custom auto-reply message for this number (overrides default)',
    example: 'Halo! Ada yang bisa kami bantu?',
  })
  @IsOptional()
  @IsString()
  autoReplyMessage?: string;

  @ApiPropertyOptional({
    description: 'Whether auto-reply is active for this number',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
