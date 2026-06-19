import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * A WhatsApp number registered as a bot. Only one entry should be `isActive`
 * at a time — the bot only operates when the connected Baileys number matches
 * the active entry.
 */
@Entity('bot_numbers')
export class BotNumber {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  phoneNumber: string;

  @Column({ nullable: true, type: 'varchar' })
  label: string | null;

  @Column({ default: false })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
