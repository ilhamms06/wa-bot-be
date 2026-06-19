import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import {
  MessagePeriod,
  QueryGroupMessagesDto,
} from './dto/query-group-messages.dto';
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

export interface GroupMessages {
  period: MessagePeriod;
  since: Date;
  until: Date;
  groupJid: string | null;
  sender: string | null;
  count: number;
  data: Message[];
}

const PERIOD_DAYS: Record<MessagePeriod, number> = {
  [MessagePeriod.Day]: 1,
  [MessagePeriod.Week]: 7,
  [MessagePeriod.Month]: 30,
};

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

  /**
   * Fetch group messages within a time window (day/week/month), optionally
   * scoped to a single group and/or a single sender. Returned oldest-first so
   * the output reads as a chronological transcript — ready to feed to the AI.
   */
  async findGroupMessages(query: QueryGroupMessagesDto): Promise<GroupMessages> {
    const period = query.period ?? MessagePeriod.Week;
    const limit = query.limit ?? 500;

    const until = new Date();
    const since = new Date(
      until.getTime() - PERIOD_DAYS[period] * 24 * 60 * 60 * 1000,
    );

    const qb = this.messagesRepository
      .createQueryBuilder('message')
      .where('message.isGroup = :isGroup', { isGroup: true })
      // Use the original message time when available, else the row insert time
      .andWhere('COALESCE(message.receivedAt, message.createdAt) >= :since', {
        since,
      });

    if (query.groupJid) {
      qb.andWhere('message.from = :groupJid', { groupJid: query.groupJid });
    }

    if (query.sender) {
      qb.andWhere('message.sender = :sender', { sender: query.sender });
    }

    const data = await qb
      .orderBy('COALESCE(message.receivedAt, message.createdAt)', 'ASC')
      .take(limit)
      .getMany();

    return {
      period,
      since,
      until,
      groupJid: query.groupJid ?? null,
      sender: query.sender ?? null,
      count: data.length,
      data,
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
