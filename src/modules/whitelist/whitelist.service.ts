import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateWhitelistDto } from './dto/create-whitelist.dto';
import { UpdateWhitelistDto } from './dto/update-whitelist.dto';
import { Whitelist } from './entities/whitelist.entity';

@Injectable()
export class WhitelistService {
  constructor(
    @InjectRepository(Whitelist)
    private readonly whitelistRepository: Repository<Whitelist>,
  ) {}

  async create(createWhitelistDto: CreateWhitelistDto): Promise<Whitelist> {
    const existing = await this.whitelistRepository.findOne({
      where: { phoneNumber: createWhitelistDto.phoneNumber },
    });

    if (existing) {
      throw new ConflictException(
        `Phone number ${createWhitelistDto.phoneNumber} is already in the whitelist`,
      );
    }

    const entry = this.whitelistRepository.create({
      ...createWhitelistDto,
      isActive: createWhitelistDto.isActive ?? true,
    });

    return this.whitelistRepository.save(entry);
  }

  findAll(): Promise<Whitelist[]> {
    return this.whitelistRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Whitelist> {
    const entry = await this.whitelistRepository.findOne({ where: { id } });
    if (!entry) {
      throw new NotFoundException(`Whitelist entry with id ${id} not found`);
    }
    return entry;
  }

  async findByPhoneNumber(phoneNumber: string): Promise<Whitelist | null> {
    return this.whitelistRepository.findOne({ where: { phoneNumber } });
  }

  async update(
    id: string,
    updateWhitelistDto: UpdateWhitelistDto,
  ): Promise<Whitelist> {
    const entry = await this.findOne(id);
    Object.assign(entry, updateWhitelistDto);
    return this.whitelistRepository.save(entry);
  }

  async remove(id: string): Promise<void> {
    const entry = await this.findOne(id);
    await this.whitelistRepository.remove(entry);
  }

  async setAiAccepted(phoneNumber: string, accepted: boolean): Promise<void> {
    await this.whitelistRepository.update(
      { phoneNumber },
      { aiAccepted: accepted },
    );
  }

  async setOwnerRepliedAt(phoneNumber: string, date: Date): Promise<void> {
    await this.whitelistRepository.update(
      { phoneNumber },
      { ownerRepliedAt: date },
    );
  }
}
