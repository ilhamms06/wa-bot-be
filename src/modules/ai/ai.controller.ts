import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { TestPromptDto } from './dto/test-prompt.dto';

@ApiTags('AI')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('test')
  @ApiOperation({
    summary: 'Test the AI with a sample message',
    description:
      'Sends a test message to the AI without sending a WhatsApp message. Useful for previewing AI behavior.',
  })
  async testPrompt(@Body() dto: TestPromptDto) {
    const reply = await this.aiService.testPrompt(
      dto.message,
      dto.systemPrompt,
    );
    return { reply };
  }
}
