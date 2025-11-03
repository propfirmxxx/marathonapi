import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentType } from '../enums/payment-type.enum';
import { PaymentGateway } from '../enums/payment-gateway.enum';
import { Marathon } from '../../marathon/entities/marathon.entity';

@Entity()
@Index(['userId', 'status', 'createdAt'])
@Index(['nowpaymentsId'])
@Index(['userId'])
@Index(['status'])
@Index(['paymentType'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING
  })
  status: PaymentStatus;

  @Column({
    type: 'enum',
    enum: PaymentType,
  })
  paymentType: PaymentType;

  @Column({
    type: 'enum',
    enum: PaymentGateway,
    default: PaymentGateway.NOWPAYMENTS,
  })
  gateway: PaymentGateway;

  @Column({ nullable: true })
  transactionId: string;

  // NowPayments specific fields
  @Column({ nullable: true })
  nowpaymentsId: string;

  @Column({ nullable: true })
  payAddress: string;

  @Column('decimal', { precision: 18, scale: 8, nullable: true })
  payAmount: number;

  @Column({ length: 10, nullable: true })
  payCurrency: string;

  @Column({ length: 50, nullable: true })
  network: string;

  @Column({ type: 'text', nullable: true })
  orderDescription: string;

  @Column({ type: 'text', nullable: true })
  invoiceUrl: string;

  @Column({ type: 'text', nullable: true })
  ipnCallbackUrl: string;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  webhookData: Record<string, any>;

  // Marathon relation (nullable for wallet charge payments)
  @ManyToOne(() => Marathon, { nullable: true })
  marathon: Marathon;

  @Column({ type: 'uuid', nullable: true })
  marathonId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 