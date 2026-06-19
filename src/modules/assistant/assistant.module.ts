import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { BotConfigModule } from '../config/config.module';
import { AssistantService } from './assistant.service';

@Module({
  imports: [AiModule, BotConfigModule],
  providers: [AssistantService],
  exports: [AssistantService],
})
export class AssistantModule {}
