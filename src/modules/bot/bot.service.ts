import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { BotConfigService } from '../config/config.service';
import { BaileysService } from '../whatsapp/baileys.service';
import { IncomingMessage } from '../whatsapp/interfaces/incoming-message.interface';
import { WhitelistService } from '../whitelist/whitelist.service';
import { BotNumberService } from './bot-number.service';

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);

  constructor(
    private readonly botConfigService: BotConfigService,
    private readonly botNumberService: BotNumberService,
    private readonly baileysService: BaileysService,
    private readonly whitelistService: WhitelistService,
    private readonly aiService: AiService,
  ) {}

  /**
   * True when `incoming` is a bot command (a `/task` message sent TO the active
   * bot number by a whitelisted contact, in a 1-on-1 chat).
   */
  async matchesCommand(incoming: IncomingMessage): Promise<boolean> {
    // Must be an inbound 1-on-1 message (sent to the bot), not our own / a group.
    if (incoming.fromMe || incoming.isGroup) return false;

    if (!(await this.botConfigService.getBoolean('bot_enabled'))) return false;

    // Only operate when the connected number is the one selected as active bot.
    const active = await this.botNumberService.getActive();
    if (active) {
      const connected = this.baileysService.getStatus().phone;
      if (connected && connected !== active.phoneNumber) return false;
    }

    // Only respond to whitelisted, active senders (avoids strangers running up
    // vision API costs).
    const entry = await this.whitelistService.findByPhoneNumber(incoming.from);
    if (!entry || !entry.isActive) return false;

    const prefix = (
      await this.botConfigService.get('bot_command_prefix')
    ).trim();
    if (!prefix) return false;

    const body = incoming.body?.trim() ?? '';
    return body.toLowerCase().startsWith(prefix.toLowerCase());
  }

  /** Handles a matched command and returns the reply text. */
  async handleCommand(incoming: IncomingMessage): Promise<string> {
    const prefix = (
      await this.botConfigService.get('bot_command_prefix')
    ).trim();
    const args = (incoming.body?.trim() ?? '').slice(prefix.length).trim();

    // Feature 1: nutrition reading — triggered by sending a food photo.
    if (incoming.messageType === 'imageMessage' && incoming.raw) {
      this.logger.log(`Nutrition request from ${incoming.from}`);
      const { buffer, mimetype } = await this.baileysService.downloadImage(
        incoming.raw,
      );
      return this.aiService.analyzeFoodNutrition(buffer, mimetype, args);
    }

    // No image — show usage help.
    return (
      `Halo 👋 Kirim *foto makanan* dengan caption "${prefix}" ` +
      `untuk dapat estimasi nutrisinya 🍽️`
    );
  }
}
