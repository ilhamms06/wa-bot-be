import { Injectable, Logger } from '@nestjs/common';
import { BotConfigService } from '../config/config.service';
import { Whitelist } from '../whitelist/entities/whitelist.entity';

@Injectable()
export class RulesService {
  private readonly logger = new Logger(RulesService.name);

  /** In-memory rate-limit tracker: phone -> list of message timestamps */
  private messageTimestamps = new Map<string, number[]>();

  /** Phones currently in cooldown after being rate-limited */
  private spamCooldowns = new Map<string, number>();

  constructor(private readonly botConfigService: BotConfigService) {}

  async isSpamming(phoneNumber: string): Promise<boolean> {
    const now = Date.now();

    // Check if still in cooldown from previous spam
    const cooldownUntil = this.spamCooldowns.get(phoneNumber);
    if (cooldownUntil && now < cooldownUntil) {
      return true;
    } else if (cooldownUntil && now >= cooldownUntil) {
      this.spamCooldowns.delete(phoneNumber);
    }

    const windowSeconds = await this.botConfigService.getNumber(
      'spam_window_seconds',
    );
    const maxMessages =
      await this.botConfigService.getNumber('spam_max_messages');
    const cooldownSeconds = await this.botConfigService.getNumber(
      'spam_cooldown_seconds',
    );

    const windowMs = windowSeconds * 1000;
    const timestamps = this.messageTimestamps.get(phoneNumber) ?? [];

    // Remove timestamps outside the window
    const recent = timestamps.filter((t) => now - t < windowMs);
    recent.push(now);
    this.messageTimestamps.set(phoneNumber, recent);

    if (recent.length > maxMessages) {
      this.spamCooldowns.set(phoneNumber, now + cooldownSeconds * 1000);
      this.logger.warn(
        `${phoneNumber} rate-limited: ${recent.length} msgs in ${windowSeconds}s — cooldown ${cooldownSeconds}s`,
      );
      return true;
    }

    return false;
  }

  async isOwnerCooldownActive(entry: Whitelist): Promise<boolean> {
    if (!entry.ownerRepliedAt) return false;

    const cooldownMinutes = await this.botConfigService.getNumber(
      'owner_cooldown_minutes',
    );
    const cooldownMs = cooldownMinutes * 60 * 1000;
    const elapsed = Date.now() - entry.ownerRepliedAt.getTime();

    if (elapsed < cooldownMs) {
      this.logger.debug(
        `Owner cooldown active for ${entry.phoneNumber} — ${Math.round((cooldownMs - elapsed) / 60000)}min remaining`,
      );
      return true;
    }

    return false;
  }

  async handleAiOffer(
    entry: Whitelist,
    messageText: string,
  ): Promise<{ accepted: boolean; replyText: string | null }> {
    if (entry.aiAccepted) {
      return { accepted: true, replyText: null };
    }

    const acceptText = await this.botConfigService.get('ai_accept_text');
    const normalized = messageText.trim().toLowerCase();

    if (normalized === acceptText.toLowerCase()) {
      return {
        accepted: true,
        replyText: 'Baik, sekarang saya akan membalas pesan kamu pakai AI.',
      };
    }

    const offerText = await this.botConfigService.get('ai_offer_text');
    return { accepted: false, replyText: offerText };
  }

  async getSpamReplyTemplate(): Promise<string> {
    return this.botConfigService.get('spam_reply_template');
  }

  async getOfflineReplyTemplate(): Promise<string> {
    return this.botConfigService.get('offline_reply_template');
  }

  async isAiEnabled(): Promise<boolean> {
    return this.botConfigService.getBoolean('ai_enabled');
  }
}
