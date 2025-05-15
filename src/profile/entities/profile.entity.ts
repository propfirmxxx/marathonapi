import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { SocialMedia } from './social-media.entity';

@Entity('profile')
export class Profile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  @Column({ length: 400, nullable: true })
  about: string;

  @Column({ length: 100, nullable: true })
  nickname: string;

  @Column({ length: 100, nullable: true })
  nationality: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ type: 'uuid' })
  userId: string;

  @OneToOne(() => User, user => user.profile)
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => SocialMedia, socialMedia => socialMedia.profile)
  socialMedia: SocialMedia[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 