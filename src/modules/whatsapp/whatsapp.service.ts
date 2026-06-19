import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiService } from '../ai/ai.service';
import { AssistantService } from '../assistant/assistant.service';
import { BotService } from '../bot/bot.service';
import { MessagesService } from '../messages/messages.service';
import { RulesService } from '../rules/rules.service';
import { WhitelistService } from '../whitelist/whitelist.service';
import { BaileysService } from './baileys.service';
import { IncomingMessage } from './interfaces/incoming-message.interface';

@Injectable()
export class WhatsappService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly defaultReplyMessage: string;

  constructor(
    private readonly baileysService: BaileysService,
    private readonly whitelistService: WhitelistService,
    private readonly messagesService: MessagesService,
    private readonly aiService: AiService,
    private readonly rulesService: RulesService,
    private readonly assistantService: AssistantService,
    private readonly botService: BotService,
    private readonly configService: ConfigService,
  ) {
    this.defaultReplyMessage =
      this.configService.get<string>('autoReply.defaultMessage') ??
      'Halo! Pesan Anda sudah kami terima.';
  }

  onModuleInit() {
    this.baileysService.registerMessageHandler((msg: IncomingMessage) =>
      this.handleMessage(msg),
    );
  }

  private async handleMessage(incoming: IncomingMessage): Promise<void> {
    // Personal assistant: a prefixed command you send yourself, in any chat.
    // Checked first so it works in groups too and never falls into the
    // owner-cooldown / auto-reply paths below.
    const command = await this.assistantService.matchCommand(incoming);
    if (command !== null) {
      await this.handleAssistantCommand(incoming, command);
      return;
    }

    // BOT module: a /task command sent TO the bot number (e.g. food photo).
    if (await this.botService.matchesCommand(incoming)) {
      await this.handleBotCommand(incoming);
      return;
    }

    if (incoming.isGroup) {
      await this.handleGroupMessage(incoming);
      return;
    }

    // Owner sent a message manually (no assistant prefix) — track it for
    // cooldown and stop here. This also absorbs the bot's own outgoing
    // replies (which are fromMe), preventing an auto-reply echo loop.
    if (incoming.fromMe) {
      await this.handleOwnerMessage(incoming);
      return;
    }

    await this.handleIncomingMessage(incoming);
  }

  private async handleAssistantCommand(
    incoming: IncomingMessage,
    command: string,
  ): Promise<void> {
    try {
      const reply = await this.assistantService.handle(command);
      await this.baileysService.sendText(incoming.from, `🤖 ${reply}`, {
        quoted: incoming.raw,
      });
      this.logger.log(`Assistant replied in ${incoming.from}`);
    } catch (err) {
      this.logger.error(
        `Assistant failed for ${incoming.from}`,
        err instanceof Error ? err.message : String(err),
      );
      try {
        await this.baileysService.sendText(
          incoming.from,
          '🤖 Maaf, asisten sedang error. Coba lagi sebentar lagi ya.',
          { quoted: incoming.raw },
        );
      } catch {
        // sending the error notice itself failed — already logged above
      }
    }
  }

  private async handleBotCommand(incoming: IncomingMessage): Promise<void> {
    try {
      const reply = await this.botService.handleCommand(incoming);
      await this.baileysService.sendText(incoming.from, reply, {
        quoted: incoming.raw,
      });
      this.logger.log(`Bot command handled for ${incoming.from}`);
    } catch (err) {
      this.logger.error(
        `Bot command failed for ${incoming.from}`,
        err instanceof Error ? err.message : String(err),
      );
      try {
        await this.baileysService.sendText(
          incoming.from,
          'Maaf, bot gagal memproses permintaanmu. Coba lagi sebentar lagi ya.',
          { quoted: incoming.raw },
        );
      } catch {
        // sending the error notice itself failed — already logged above
      }
    }
  }

  private async handleGroupMessage(incoming: IncomingMessage): Promise<void> {
    const entry = await this.whitelistService.findByPhoneNumber(incoming.from);
    if (!entry || !entry.isActive) {
      return;
    }

    await this.messagesService.create({
      from: incoming.from,
      body: incoming.body,
      sender: incoming.sender,
      isGroup: true,
      messageId: incoming.messageId,
      sessionId: 'baileys',
      messageType: incoming.messageType,
      receivedAt: incoming.timestamp,
    });

    this.logger.debug(
      `Group message saved from ${incoming.sender} in ${incoming.from}`,
    );
  }

  private async handleOwnerMessage(incoming: IncomingMessage): Promise<void> {
    const entry = await this.whitelistService.findByPhoneNumber(incoming.from);
    if (entry) {
      await this.whitelistService.setOwnerRepliedAt(incoming.from, new Date());
      this.logger.log(
        `Owner replied to ${incoming.from} — pausing bot for cooldown period`,
      );
    }
  }

  private async handleIncomingMessage(
    incoming: IncomingMessage,
  ): Promise<void> {
    // Always log
    const savedMessage = await this.messagesService.create({
      from: incoming.from,
      body: incoming.body,
      messageId: incoming.messageId,
      sessionId: 'baileys',
      messageType: incoming.messageType,
      receivedAt: incoming.timestamp,
    });

    // Check whitelist
    const entry = await this.whitelistService.findByPhoneNumber(incoming.from);
    if (!entry || !entry.isActive) {
      this.logger.debug(`${incoming.from} is not whitelisted — skipping`);
      return;
    }

    // Owner cooldown — if owner recently replied manually, skip bot
    if (await this.rulesService.isOwnerCooldownActive(entry)) {
      this.logger.debug(`${incoming.from} — owner cooldown active, skipping`);
      return;
    }

    // Spam rate limit
    if (await this.rulesService.isSpamming(incoming.from)) {
      const spamReply = await this.rulesService.getSpamReplyTemplate();
      await this.sendAndMarkReplied(incoming.from, spamReply, savedMessage.id);
      return;
    }

    // AI enabled check
    const aiEnabled = await this.rulesService.isAiEnabled();
    if (!aiEnabled) {
      const offlineReply = await this.rulesService.getOfflineReplyTemplate();
      await this.sendAndMarkReplied(
        incoming.from,
        offlineReply,
        savedMessage.id,
      );
      return;
    }

    // AI offer/accept flow
    const { accepted, replyText: offerReply } =
      await this.rulesService.handleAiOffer(entry, incoming.body);

    if (!accepted) {
      if (offerReply) {
        await this.sendAndMarkReplied(
          incoming.from,
          offerReply,
          savedMessage.id,
        );
      }
      return;
    }

    // User just accepted — save state and send confirmation
    if (!entry.aiAccepted) {
      await this.whitelistService.setAiAccepted(incoming.from, true);
      if (offerReply) {
        await this.sendAndMarkReplied(
          incoming.from,
          offerReply,
          savedMessage.id,
        );
        return;
      }
    }

    // Generate AI reply
    let replyText: string;
    try {
      replyText = await this.aiService.generateReply(
        incoming.from,
        incoming.body,
      );
    } catch (err) {
      this.logger.error(
        `AI failed for ${incoming.from}, falling back to static reply`,
        err instanceof Error ? err.message : String(err),
      );
      replyText = entry.autoReplyMessage ?? this.defaultReplyMessage;
    }

    await this.sendAndMarkReplied(incoming.from, replyText, savedMessage.id);
  }

  private async sendAndMarkReplied(
    phoneNumber: string,
    text: string,
    messageId: string,
  ): Promise<void> {
    try {
      await this.baileysService.sendText(phoneNumber, text);
      await this.messagesService.markReplied(messageId, text);
      this.logger.log(`Replied to ${phoneNumber}`);
    } catch (err) {
      this.logger.error(
        `Failed to send reply to ${phoneNumber}`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  getGroups() {
    return this.baileysService.getGroups();
  }

  getStatus() {
    return this.baileysService.getStatus();
  }

  getQrCode(): string | null {
    return this.baileysService.getQrCode();
  }

  logout() {
    return this.baileysService.logout();
  }
}
