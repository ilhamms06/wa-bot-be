import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { BotConfigService } from './config.service';
import { UpdateConfigDto } from './dto/update-config.dto';

@ApiTags('Config')
@Controller('config')
export class BotConfigController {
  constructor(private readonly configService: BotConfigService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all bot configuration',
    description: 'Returns all key-value config entries.',
  })
  getAll() {
    return this.configService.getAll();
  }

  @Get(':key')
  @ApiOperation({
    summary: 'Get a single config value by key',
    description: 'Returns the value of a specific config key.',
  })
  @ApiParam({
    name: 'key',
    description:
      'Config key (e.g. system_prompt, ai_enabled, spam_max_messages)',
  })
  @ApiNotFoundResponse({ description: 'Config key not found' })
  async getByKey(@Param('key') key: string) {
    const value = await this.configService.get(key);
    return { key, value };
  }

  @Put(':key')
  @ApiOperation({
    summary: 'Update a config value',
    description: 'Sets the value for a config key. Takes effect immediately.',
  })
  @ApiParam({
    name: 'key',
    description: 'Config key to update',
  })
  async update(@Param('key') key: string, @Body() dto: UpdateConfigDto) {
    const config = await this.configService.set(key, dto.value);
    return {
      key: config.key,
      value: config.value,
      updatedAt: config.updatedAt,
    };
  }
}
