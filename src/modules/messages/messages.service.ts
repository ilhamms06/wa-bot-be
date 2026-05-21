import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { QueryMessagesDto } from './dto/query-messages.dto';
import { Message } from './entities/message.entity';

export interface CreateMessageData {
  from: string;
  to?: string;
  body?: string;
  messageId?: string;
  sessionId?: string;
  messageType?: string;
  receivedAt?: Date;
  sender?: string | null;
  isGroup?: boolean;
}

export interface PaginatedMessages {
  data: Message[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messagesRepository: Repository<Message>,
  ) {}

  async create(data: CreateMessageData): Promise<Message> {
    const message = this.messagesRepository.create(data);
    return this.messagesRepository.save(message);
  }

  async findAll(query: QueryMessagesDto): Promise<PaginatedMessages> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Message> = {};

    if (query.from) {
      where.from = query.from;
    }

    if (query.replied !== undefined) {
      where.replied = query.replied === 'true';
    }

    const [data, total] = await this.messagesRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Message> {
    const message = await this.messagesRepository.findOne({ where: { id } });
    if (!message) {
      throw new NotFoundException(`Message with id ${id} not found`);
    }
    return message;
  }

  async markReplied(id: string, replyMessage: string): Promise<void> {
    await this.messagesRepository.update(id, {
      replied: true,
      replyMessage,
    });
  }

  /**
   * Returns the last N messages for a given phone number, ordered oldest-first.
   * Used to build conversation context for AI.
   */
  async getConversationHistory(
    phoneNumber: string,
    limit: number,
  ): Promise<Message[]> {
    const messages = await this.messagesRepository.find({
      where: { from: phoneNumber },
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return messages.reverse();
  }
}
