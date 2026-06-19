import { Module } from '@nestjs/common';
import { BaileysService } from './baileys.service';

/**
 * Owns the single Baileys WhatsApp connection. Exported so that any module
 * (WhatsApp auto-reply, Bot, ...) can send messages / download media through
 * the same socket without creating a circular dependency on WhatsappModule.
 */
@Module({
  providers: [BaileysService],
  exports: [BaileysService],
})
export class BaileysModule {}
