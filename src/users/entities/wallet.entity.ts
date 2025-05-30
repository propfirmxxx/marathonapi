import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 255 })
  address: string;

  @Column({ length: 50 })
  network: string;

  @Column({ length: 50, nullable: true })
  currency: string;

  @Column({ default: false })
  isActive: boolean;

  @ManyToOne(() => User, user => user.wallets)
  @JoinColumn({ name: 'user_uid' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 