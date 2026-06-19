import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { QueryGroupMessagesDto } from './dto/query-group-messages.dto';
import { QueryMessagesDto } from './dto/query-messages.dto';
import { MessagesService } from './messages.service';

@ApiTags('Messages')
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  @ApiOperation({
    summary: 'Get paginated incoming message logs',
    description:
      'Returns all logged incoming WhatsApp messages with pagination and optional filters.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({
    name: 'replied',
    required: false,
    type: String,
    enum: ['true', 'false'],
  })
  findAll(@Query() query: QueryMessagesDto) {
    return this.messagesService.findAll(query);
  }

  @Get('groups')
  @ApiOperation({
    summary: 'Get group messages within a time window',
    description:
      'Returns group messages from the last day/week/month, oldest-first. ' +
      'Optionally scoped to a single group (groupJid) and/or sender. ' +
      'Intended as input for AI analysis of group activity.',
  })
  @ApiQuery({ name: 'period', required: false, enum: ['day', 'week', 'month'] })
  @ApiQuery({ name: 'groupJid', required: false, type: String })
  @ApiQuery({ name: 'sender', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findGroupMessages(@Query() query: QueryGroupMessagesDto) {
    return this.messagesService.findGroupMessages(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single message log by ID' })
  @ApiParam({ name: 'id', description: 'Message UUID' })
  @ApiNotFoundResponse({ description: 'Message not found' })
  findOne(@Param('id') id: string) {
    return this.messagesService.findOne(id);
  }
}
