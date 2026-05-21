import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { BotConfig } from './modules/config/entities/bot-config.entity';
import { BotConfigModule } from './modules/config/config.module';
import { Message } from './modules/messages/entities/message.entity';
import { MessagesModule } from './modules/messages/messages.module';
import { Whitelist } from './modules/whitelist/entities/whitelist.entity';
import { WhitelistModule } from './modules/whitelist/whitelist.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('database.url'),
        entities: [Whitelist, Message, BotConfig],
        synchronize: true,
      }),
    }),
    BotConfigModule,
    WhitelistModule,
    MessagesModule,
    WhatsappModule,
  ],
})
export class AppModule {}
