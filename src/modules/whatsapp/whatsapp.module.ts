import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AssistantModule } from '../assistant/assistant.module';
import { BotModule } from '../bot/bot.module';
import { MessagesModule } from '../messages/messages.module';
import { RulesModule } from '../rules/rules.module';
import { WhitelistModule } from '../whitelist/whitelist.module';
import { BaileysModule } from './baileys.module';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';

@Module({
  imports: [
    BaileysModule,
    WhitelistModule,
    MessagesModule,
    AiModule,
    RulesModule,
    AssistantModule,
    BotModule,
  ],
  controllers: [WhatsappController],
  providers: [WhatsappService],
})
export class WhatsappModule {}
