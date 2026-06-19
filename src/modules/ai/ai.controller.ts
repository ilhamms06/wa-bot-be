import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { AnalyzeGroupDto } from './dto/analyze-group.dto';
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

  @Post('analyze-group')
  @ApiOperation({
    summary: 'Analyze group activity / habits with AI',
    description:
      'Fetches group messages for the given period (day/week/month) and asks ' +
      'the AI to analyze activity patterns. Set "sender" to focus on one person ' +
      '(e.g. analyze your own habits in the group).',
  })
  analyzeGroup(@Body() dto: AnalyzeGroupDto) {
    return this.aiService.analyzeGroupActivity(dto);
  }
}
