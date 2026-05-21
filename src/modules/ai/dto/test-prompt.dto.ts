import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TestPromptDto {
  @ApiProperty({
    description: 'The user message to test',
    example: 'Halo, jam berapa toko buka?',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    description:
      'Optional system prompt override for testing. If not provided, uses the active system prompt.',
    example: 'Kamu adalah asisten toko buku online.',
  })
  @IsOptional()
  @IsString()
  systemPrompt?: string;
}
