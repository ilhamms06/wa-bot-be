import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BotConfig } from './entities/bot-config.entity';

export interface ConfigDefaults {
  [key: string]: string;
}

@Injectable()
export class BotConfigService implements OnModuleInit {
  private readonly logger = new Logger(BotConfigService.name);

  private readonly defaults: ConfigDefaults;

  constructor(
    @InjectRepository(BotConfig)
    private readonly configRepository: Repository<BotConfig>,
    private readonly configService: ConfigService,
  ) {
    this.defaults = {
      system_prompt:
        this.configService.get<string>('openai.systemPrompt') ??
        'Kamu adalah asisten customer service yang ramah dan membantu. Jawab dengan bahasa Indonesia yang sopan.',
      source_of_truth: '',
      ai_behavior: 'casual',
      ai_model: this.configService.get<string>('openai.model') ?? 'gpt-4o-mini',
      ai_history_limit: String(
        this.configService.get<number>('ai.conversationHistoryLimit') ?? 10,
      ),
      ai_max_tokens: '500',
      ai_enabled: 'true',
      spam_window_seconds: '60',
      spam_max_messages: '5',
      spam_cooldown_seconds: '300',
      spam_reply_template: 'Pesan kamu terlalu banyak. Coba lagi nanti ya.',
      owner_cooldown_minutes: '30',
      offline_reply_template:
        this.configService.get<string>('autoReply.defaultMessage') ??
        'Halo! Pesan Anda sudah kami terima.',
      ai_offer_text:
        'Halo! Saya bisa bantu jawab pertanyaan kamu pakai AI. Ketik "ya" kalau mau lanjut.',
      ai_accept_text: 'ya',
    };
  }

  async onModuleInit() {
    await this.seedDefaults();
  }

  private async seedDefaults(): Promise<void> {
    let seeded = 0;
    for (const [key, defaultValue] of Object.entries(this.defaults)) {
      const existing = await this.configRepository.findOne({
        where: { key },
      });
      if (!existing) {
        await this.configRepository.save(
          this.configRepository.create({ key, value: defaultValue }),
        );
        seeded++;
      }
    }
    if (seeded > 0) {
      this.logger.log(`Seeded ${seeded} default config values`);
    }
  }

  async get(key: string): Promise<string> {
    const config = await this.configRepository.findOne({ where: { key } });
    return config?.value ?? this.defaults[key] ?? '';
  }

  async getNumber(key: string): Promise<number> {
    const val = await this.get(key);
    return parseInt(val, 10) || 0;
  }

  async getBoolean(key: string): Promise<boolean> {
    const val = await this.get(key);
    return val === 'true';
  }

  async set(key: string, value: string): Promise<BotConfig> {
    let config = await this.configRepository.findOne({ where: { key } });
    if (config) {
      config.value = value;
    } else {
      config = this.configRepository.create({ key, value });
    }
    return this.configRepository.save(config);
  }

  async getAll(): Promise<BotConfig[]> {
    return this.configRepository.find({ order: { key: 'ASC' } });
  }
}
