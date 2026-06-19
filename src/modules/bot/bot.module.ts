import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { BotConfigModule } from '../config/config.module';
import { BaileysModule } from '../whatsapp/baileys.module';
import { WhitelistModule } from '../whitelist/whitelist.module';
import { BotController } from './bot.controller';
import { BotNumberService } from './bot-number.service';
import { BotService } from './bot.service';
import { BotNumber } from './entities/bot-number.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BotNumber]),
    BotConfigModule,
    BaileysModule,
    WhitelistModule,
    AiModule,
  ],
  controllers: [BotController],
  providers: [BotNumberService, BotService],
  exports: [BotService],
})
export class BotModule {}
