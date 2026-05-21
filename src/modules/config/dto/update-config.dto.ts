import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateConfigDto {
  @ApiProperty({
    description: 'The config value to set',
    example: 'Kamu adalah asisten yang ramah.',
  })
  @IsString()
  @IsNotEmpty()
  value: string;
}
