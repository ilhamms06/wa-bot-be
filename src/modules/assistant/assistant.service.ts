import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { BotConfigService } from '../config/config.service';
import { IncomingMessage } from '../whatsapp/interfaces/incoming-message.interface';

/**
 * Personal assistant that uses the owner's own WhatsApp number as the bot.
 *
 * It only ever triggers on messages the owner sends (`fromMe`) that start with
 * a configurable prefix (default ".ai"). Because the prefix is required, the
 * bot's own replies — which never start with the prefix — are ignored, which
 * prevents the assistant from answering itself in a loop.
 */
@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly botConfigService: BotConfigService,
  ) {}

  /**
   * Returns the command text (everything after the prefix) when `incoming` is
   * an assistant command from the owner; otherwise returns null.
   */
  async matchCommand(incoming: IncomingMessage): Promise<string | null> {
    if (!incoming.fromMe) return null;

    const enabled = await this.botConfigService.getBoolean('assistant_enabled');
    const prefix = (await this.botConfigService.get('assistant_prefix')).trim();
    const body = incoming.body?.trim() ?? '';
    const matched =
      enabled &&
      !!prefix &&
      body.toLowerCase().startsWith(prefix.toLowerCase());

    this.logger.debug(
      `matchCommand: enabled=${enabled} prefix="${prefix}" body="${body.substring(0, 30)}" matched=${matched}`,
    );

    if (!matched) return null;

    return body.slice(prefix.length).trim();
  }

  /** Produces the assistant reply for a matched command. */
  async handle(commandBody: string): Promise<string> {
    if (!commandBody) {
      const prefix = (
        await this.botConfigService.get('assistant_prefix')
      ).trim();
      return `Halo 👋 Aku asistenmu. Ketik "${prefix} <pertanyaan>" untuk bertanya apa saja.`;
    }

    this.logger.log(`Assistant command: "${commandBody.substring(0, 60)}"`);
    return this.aiService.generateAssistantReply(commandBody);
  }
}
