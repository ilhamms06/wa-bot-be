import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { BotConfigService } from '../config/config.service';
import { MessagesService } from '../messages/messages.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openai: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly botConfigService: BotConfigService,
    private readonly messagesService: MessagesService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('openai.apiKey'),
    });
  }

  async generateReply(
    phoneNumber: string,
    incomingText: string,
  ): Promise<string> {
    const [
      systemPrompt,
      sourceOfTruth,
      aiBehavior,
      model,
      historyLimit,
      maxTokens,
    ] = await Promise.all([
      this.botConfigService.get('system_prompt'),
      this.botConfigService.get('source_of_truth'),
      this.botConfigService.get('ai_behavior'),
      this.botConfigService.get('ai_model'),
      this.botConfigService.getNumber('ai_history_limit'),
      this.botConfigService.getNumber('ai_max_tokens'),
    ]);

    let fullSystemPrompt = systemPrompt;
    if (sourceOfTruth) {
      fullSystemPrompt += `\n\nBerikut informasi yang kamu ketahui:\n${sourceOfTruth}`;
    }
    if (aiBehavior) {
      fullSystemPrompt += `\n\nPerilaku: ${aiBehavior}`;
    }

    const history = await this.messagesService.getConversationHistory(
      phoneNumber,
      historyLimit,
    );

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: fullSystemPrompt },
    ];

    for (const msg of history) {
      if (msg.body) {
        messages.push({ role: 'user', content: msg.body });
      }
      if (msg.replied && msg.replyMessage) {
        messages.push({ role: 'assistant', content: msg.replyMessage });
      }
    }

    messages.push({ role: 'user', content: incomingText });

    this.logger.debug(
      `Calling OpenAI for ${phoneNumber} with ${messages.length} messages (model: ${model})`,
    );

    const completion = await this.openai.chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens > 0 ? maxTokens : undefined,
    });

    const reply = completion.choices[0]?.message?.content?.trim();

    if (!reply) {
      throw new Error('OpenAI returned an empty response');
    }

    this.logger.log(`AI reply for ${phoneNumber}: "${reply.substring(0, 80)}"`);

    return reply;
  }

  async testPrompt(
    message: string,
    systemPromptOverride?: string,
  ): Promise<string> {
    const [systemPrompt, model, maxTokens] = await Promise.all([
      systemPromptOverride
        ? Promise.resolve(systemPromptOverride)
        : this.botConfigService.get('system_prompt'),
      this.botConfigService.get('ai_model'),
      this.botConfigService.getNumber('ai_max_tokens'),
    ]);

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ];

    const completion = await this.openai.chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens > 0 ? maxTokens : undefined,
    });

    return completion.choices[0]?.message?.content?.trim() ?? '';
  }
}
