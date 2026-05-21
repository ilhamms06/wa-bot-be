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
import { CreateWhitelistDto } from './dto/create-whitelist.dto';
import { UpdateWhitelistDto } from './dto/update-whitelist.dto';
import { WhitelistService } from './whitelist.service';

@ApiTags('Whitelist')
@Controller('whitelist')
export class WhitelistController {
  constructor(private readonly whitelistService: WhitelistService) {}

  @Post()
  @ApiOperation({ summary: 'Add a phone number to the whitelist' })
  create(@Body() createWhitelistDto: CreateWhitelistDto) {
    return this.whitelistService.create(createWhitelistDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all whitelisted phone numbers' })
  findAll() {
    return this.whitelistService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single whitelist entry by ID' })
  @ApiParam({ name: 'id', description: 'Whitelist entry UUID' })
  @ApiNotFoundResponse({ description: 'Entry not found' })
  findOne(@Param('id') id: string) {
    return this.whitelistService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a whitelist entry' })
  @ApiParam({ name: 'id', description: 'Whitelist entry UUID' })
  @ApiNotFoundResponse({ description: 'Entry not found' })
  update(
    @Param('id') id: string,
    @Body() updateWhitelistDto: UpdateWhitelistDto,
  ) {
    return this.whitelistService.update(id, updateWhitelistDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a phone number from the whitelist' })
  @ApiParam({ name: 'id', description: 'Whitelist entry UUID' })
  @ApiNoContentResponse({ description: 'Entry removed successfully' })
  @ApiNotFoundResponse({ description: 'Entry not found' })
  remove(@Param('id') id: string) {
    return this.whitelistService.remove(id);
  }
}
