import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { MessagesModule } from '../messages/messages.module';
import { RulesModule } from '../rules/rules.module';
import { WhitelistModule } from '../whitelist/whitelist.module';
import { BaileysService } from './baileys.service';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';

@Module({
  imports: [WhitelistModule, MessagesModule, AiModule, RulesModule],
  controllers: [WhatsappController],
  providers: [BaileysService, WhatsappService],
})
export class WhatsappModule {}
