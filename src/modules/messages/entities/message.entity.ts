import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  from: string;

  @Column({ nullable: true, type: 'varchar' })
  sender: string | null;

  @Column({ default: false })
  isGroup: boolean;

  @Column({ nullable: true, type: 'varchar' })
  to: string | null;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  @Column({ nullable: true, type: 'varchar' })
  messageId: string | null;

  @Column({ nullable: true, type: 'varchar' })
  sessionId: string | null;

  @Column({ default: false })
  replied: boolean;

  @Column({ nullable: true, type: 'text' })
  replyMessage: string | null;

  @Column({ nullable: true, type: 'varchar' })
  messageType: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  receivedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
