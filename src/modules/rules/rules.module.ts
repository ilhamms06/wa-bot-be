import { Module } from '@nestjs/common';
import { BotConfigModule } from '../config/config.module';
import { RulesService } from './rules.service';

@Module({
  imports: [BotConfigModule],
  providers: [RulesService],
  exports: [RulesService],
})
export class RulesModule {}
