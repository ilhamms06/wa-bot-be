import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { BotNumberService } from './bot-number.service';
import { CreateBotNumberDto } from './dto/create-bot-number.dto';

@ApiTags('Bot')
@Controller('bot/numbers')
export class BotController {
  constructor(private readonly botNumberService: BotNumberService) {}

  @Post()
  @ApiOperation({ summary: 'Register a phone number as a bot' })
  create(@Body() dto: CreateBotNumberDto) {
    return this.botNumberService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all registered bot numbers' })
  findAll() {
    return this.botNumberService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Get the currently active bot number' })
  getActive() {
    return this.botNumberService.getActive();
  }

  @Patch(':id/activate')
  @ApiOperation({
    summary: 'Set a bot number as active',
    description: 'Marks this number active and deactivates all others.',
  })
  @ApiParam({ name: 'id', description: 'Bot number UUID' })
  @ApiNotFoundResponse({ description: 'Bot number not found' })
  activate(@Param('id') id: string) {
    return this.botNumberService.setActive(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a bot number' })
  @ApiParam({ name: 'id', description: 'Bot number UUID' })
  @ApiNoContentResponse({ description: 'Bot number removed successfully' })
  @ApiNotFoundResponse({ description: 'Bot number not found' })
  remove(@Param('id') id: string) {
    return this.botNumberService.remove(id);
  }
}
