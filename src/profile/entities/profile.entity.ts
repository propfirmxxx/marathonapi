import { Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { SocialMedia } from './social-media.entity';

@Entity()
export class Profile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ nullable: true })
  nickname: string;

  @Column({ nullable: true })
  nationality: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @OneToOne(() => User)
  @JoinColumn()
  user: User;

  @OneToMany(() => SocialMedia, socialMedia => socialMedia.profile)
  socialMedias: SocialMedia[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
} 