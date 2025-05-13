import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Profile } from './profile.entity';

export enum SocialMediaType {
  INSTAGRAM = 'instagram',
  TELEGRAM = 'telegram',
  YOUTUBE = 'youtube',
  TWITTER = 'twitter',
  LINKEDIN = 'linkedin',
}

@Entity()
export class SocialMedia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: SocialMediaType,
  })
  type: SocialMediaType;

  @Column()
  url: string;

  @ManyToOne(() => Profile, profile => profile.socialMedias)
  @JoinColumn()
  profile: Profile;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
} 