import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { QueryGroupMessagesDto } from '../../messages/dto/query-group-messages.dto';

export class AnalyzeGroupDto extends QueryGroupMessagesDto {
  @ApiPropertyOptional({
    description:
      'Optional specific question/instruction for the AI. If omitted, the AI gives a general habit & pattern analysis.',
    example: 'Analisa kebiasaan dan gaya komunikasi saya di grup ini',
  })
  @IsOptional()
  @IsString()
  question?: string;
}
