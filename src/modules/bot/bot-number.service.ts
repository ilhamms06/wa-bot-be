import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateBotNumberDto } from './dto/create-bot-number.dto';
import { BotNumber } from './entities/bot-number.entity';

@Injectable()
export class BotNumberService {
  constructor(
    @InjectRepository(BotNumber)
    private readonly botNumberRepository: Repository<BotNumber>,
  ) {}

  async create(dto: CreateBotNumberDto): Promise<BotNumber> {
    const existing = await this.botNumberRepository.findOne({
      where: { phoneNumber: dto.phoneNumber },
    });
    if (existing) {
      throw new ConflictException(
        `Bot number ${dto.phoneNumber} is already registered`,
      );
    }

    const entry = this.botNumberRepository.create({
      ...dto,
      isActive: dto.isActive ?? false,
    });
    const saved = await this.botNumberRepository.save(entry);

    // Keep only one active number.
    if (saved.isActive) {
      await this.deactivateOthers(saved.id);
    }
    return saved;
  }

  findAll(): Promise<BotNumber[]> {
    return this.botNumberRepository.find({ order: { createdAt: 'DESC' } });
  }

  getActive(): Promise<BotNumber | null> {
    return this.botNumberRepository.findOne({ where: { isActive: true } });
  }

  async setActive(id: string): Promise<BotNumber> {
    const entry = await this.findOne(id);
    entry.isActive = true;
    const saved = await this.botNumberRepository.save(entry);
    await this.deactivateOthers(saved.id);
    return saved;
  }

  async remove(id: string): Promise<void> {
    const entry = await this.findOne(id);
    await this.botNumberRepository.remove(entry);
  }

  private async findOne(id: string): Promise<BotNumber> {
    const entry = await this.botNumberRepository.findOne({ where: { id } });
    if (!entry) {
      throw new NotFoundException(`Bot number with id ${id} not found`);
    }
    return entry;
  }

  private async deactivateOthers(activeId: string): Promise<void> {
    await this.botNumberRepository
      .createQueryBuilder()
      .update(BotNumber)
      .set({ isActive: false })
      .where('id != :activeId', { activeId })
      .execute();
  }
}
