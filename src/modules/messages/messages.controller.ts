import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
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

  @Get(':id')
  @ApiOperation({ summary: 'Get a single message log by ID' })
  @ApiParam({ name: 'id', description: 'Message UUID' })
  @ApiNotFoundResponse({ description: 'Message not found' })
  findOne(@Param('id') id: string) {
    return this.messagesService.findOne(id);
  }
}
