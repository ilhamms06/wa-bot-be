import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum MessagePeriod {
  Day = 'day',
  Week = 'week',
  Month = 'month',
}

export class QueryGroupMessagesDto {
  @ApiPropertyOptional({
    description: 'Time window to fetch messages from',
    enum: MessagePeriod,
    default: MessagePeriod.Week,
  })
  @IsOptional()
  @IsEnum(MessagePeriod)
  period?: MessagePeriod = MessagePeriod.Week;

  @ApiPropertyOptional({
    description:
      'Filter by a specific group JID (e.g. 120363xxx@g.us). Omit for all groups.',
    example: '120363123456789@g.us',
  })
  @IsOptional()
  @IsString()
  groupJid?: string;

  @ApiPropertyOptional({
    description:
      'Filter by sender phone number (the group participant). Useful to analyze a single person.',
    example: '628123456789',
  })
  @IsOptional()
  @IsString()
  sender?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of messages to return (safety cap)',
    default: 500,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2000)
  limit?: number = 500;
}
