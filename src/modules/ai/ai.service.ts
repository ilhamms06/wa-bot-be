import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { BotConfigService } from '../config/config.service';
import { MessagesService } from '../messages/messages.service';
import { AnalyzeGroupDto } from './dto/analyze-group.dto';

export interface GroupAnalysis {
  period: string;
  since: Date;
  until: Date;
  groupJid: string | null;
  sender: string | null;
  messageCount: number;
  analysis: string;
}

// Analysis answers benefit from more room than a short chat reply.
const ANALYSIS_MAX_TOKENS = 1500;

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

  /**
   * Fetches group messages for the given time window and asks the AI to
   * analyze activity / habits. If `sender` is set, the analysis focuses on
   * that single person (e.g. "analyze my habits in this group").
   */
  async analyzeGroupActivity(dto: AnalyzeGroupDto): Promise<GroupAnalysis> {
    const result = await this.messagesService.findGroupMessages(dto);

    if (result.count === 0) {
      return {
        period: result.period,
        since: result.since,
        until: result.until,
        groupJid: result.groupJid,
        sender: result.sender,
        messageCount: 0,
        analysis:
          'Tidak ada pesan grup pada periode ini, jadi belum bisa dianalisa.',
      };
    }

    const model = await this.botConfigService.get('ai_model');

    const transcript = result.data
      .map((msg) => {
        const t = msg.receivedAt ?? msg.createdAt;
        const stamp = t.toISOString().slice(0, 16).replace('T', ' ');
        return `[${stamp}] ${msg.sender ?? 'unknown'}: ${msg.body ?? ''}`;
      })
      .join('\n');

    const focus = result.sender
      ? `Fokuskan analisa pada pesan dari pengirim dengan nomor ${result.sender}.`
      : 'Analisa aktivitas grup secara keseluruhan beserta para pesertanya.';

    const systemPrompt = [
      'Kamu adalah analis percakapan. Kamu diberikan transkrip pesan dari sebuah grup WhatsApp,',
      'di mana setiap baris berformat "[waktu] pengirim: isi pesan".',
      focus,
      'Berikan analisa dalam Bahasa Indonesia yang ringkas dan terstruktur dalam poin-poin, mencakup:',
      '- Jam/waktu paling aktif',
      '- Topik yang paling sering dibahas',
      '- Gaya bahasa & nada komunikasi',
      '- Frekuensi dan pola keaktifan',
      '- Insight atau kebiasaan menarik lainnya',
    ].join('\n');

    const userContent = dto.question
      ? `${dto.question}\n\nBerikut transkripnya:\n\n${transcript}`
      : `Berikut transkrip percakapan grup:\n\n${transcript}`;

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ];

    this.logger.debug(
      `Analyzing ${result.count} group messages (period: ${result.period}, model: ${model})`,
    );

    const completion = await this.openai.chat.completions.create({
      model,
      messages,
      max_tokens: ANALYSIS_MAX_TOKENS,
    });

    const analysis = completion.choices[0]?.message?.content?.trim();

    if (!analysis) {
      throw new Error('OpenAI returned an empty analysis');
    }

    return {
      period: result.period,
      since: result.since,
      until: result.until,
      groupJid: result.groupJid,
      sender: result.sender,
      messageCount: result.count,
      analysis,
    };
  }

  /**
   * Personal assistant reply. Uses the dedicated `assistant_system_prompt`
   * persona, kept separate from the customer-service `system_prompt`.
   * Stateless by design — a command is answered on its own, not as part of
   * the chat's customer conversation history.
   */
  async generateAssistantReply(question: string): Promise<string> {
    const [systemPrompt, model, maxTokens] = await Promise.all([
      this.botConfigService.get('assistant_system_prompt'),
      this.botConfigService.get('ai_model'),
      this.botConfigService.getNumber('ai_max_tokens'),
    ]);

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ];

    this.logger.debug(`Assistant calling OpenAI (model: ${model})`);

    const completion = await this.openai.chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens > 0 ? maxTokens : undefined,
    });

    const reply = completion.choices[0]?.message?.content?.trim();

    if (!reply) {
      throw new Error('OpenAI returned an empty response');
    }

    return reply;
  }

  /**
   * Reads a food photo and returns an estimated nutrition breakdown.
   * Requires a vision-capable model (the default `gpt-4o-mini` supports it).
   */
  async analyzeFoodNutrition(
    image: Buffer,
    mimetype: string,
    note?: string,
  ): Promise<string> {
    const [systemPrompt, model] = await Promise.all([
      this.botConfigService.get('bot_nutrition_prompt'),
      this.botConfigService.get('ai_model'),
    ]);

    const dataUrl = `data:${mimetype};base64,${image.toString('base64')}`;
    const userText =
      note && note.length > 0
        ? note
        : 'Analisa nutrisi makanan pada foto ini.';

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: userText },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ];

    this.logger.debug(`Analyzing food nutrition image (model: ${model})`);

    const completion = await this.openai.chat.completions.create({
      model,
      messages,
      max_tokens: ANALYSIS_MAX_TOKENS,
    });

    const result = completion.choices[0]?.message?.content?.trim();

    if (!result) {
      throw new Error('OpenAI returned an empty nutrition analysis');
    }

    return result;
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
