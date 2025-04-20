import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('meta_trader_accounts')
export class MetaTraderAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  accountId: string;

  @Column()
  name: string;

  @Column()
  login: string;

  @Column()
  password: string;

  @Column()
  server: string;

  @Column()
  @Index()
  userId: string;

  @Column({ default: 'active' })
  status: string;

  @Column({ default: 'mt5' })
  platform: string;

  @Column({ default: 'cloud' })
  type: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 