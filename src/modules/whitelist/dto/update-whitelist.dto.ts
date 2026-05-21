import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { CreateWhitelistDto } from './create-whitelist.dto';

export class UpdateWhitelistDto extends PartialType(CreateWhitelistDto) {
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
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
