import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('whitelist')
export class Whitelist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  phoneNumber: string;

  @Column({ nullable: true, type: 'varchar' })
  label: string | null;

  @Column({ nullable: true, type: 'text' })
  autoReplyMessage: string | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  aiAccepted: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  ownerRepliedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
