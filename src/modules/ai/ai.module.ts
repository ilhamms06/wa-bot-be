import { Module } from '@nestjs/common';
import { BotConfigModule } from '../config/config.module';
import { MessagesModule } from '../messages/messages.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [BotConfigModule, MessagesModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
