import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Wallet } from '@/wallet/entities/wallet.entity';
import { VirtualWallet } from '@/virtual-wallet/entities/virtual-wallet.entity';
import { Profile } from '../../profile/entities/profile.entity';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ 
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
    enumName: 'user_role_enum'
  })
  role: UserRole;

  @Column({ nullable: true })
  googleId?: string;

  @OneToOne(() => Profile, profile => profile.user)
  profile: Profile;

  @OneToMany(() => Wallet, wallet => wallet.user)
  wallets: Wallet[];

  @OneToOne(() => VirtualWallet, virtualWallet => virtualWallet.user)
  virtualWallet: VirtualWallet;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
} 