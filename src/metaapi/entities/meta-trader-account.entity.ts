import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, Check } from 'typeorm';

export enum MetaTraderAccountStatus {
  DEPLOYED = 'deployed',
  UNDEPLOYED = 'undeployed'
}

@Entity('metatrader_accounts')
@Check('check_passwords', '("masterPassword" IS NOT NULL) OR ("investorPassword" IS NOT NULL)')
export class MetaTraderAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  login: string;

  @Column({ nullable: true })
  masterPassword: string;

  @Column({ nullable: true })
  investorPassword: string;

  @Column()
  server: string;

  @Column()
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: MetaTraderAccountStatus,
    default: MetaTraderAccountStatus.UNDEPLOYED
  })
  status: MetaTraderAccountStatus;

  @Column({ default: 'mt5' })
  platform: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 