import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Profile } from './profile.entity';

export enum SocialMediaType {
  INSTAGRAM = 'instagram',
  TELEGRAM = 'telegram',
  YOUTUBE = 'youtube',
  TWITTER = 'twitter',
  LINKEDIN = 'linkedin'
}

@Entity('social_media')
export class SocialMedia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: SocialMediaType,
    enumName: 'social_media_type_enum'
  })
  type: SocialMediaType;

  @Column()
  url: string;

  @ManyToOne(() => Profile, profile => profile.socialMedia, { onDelete: 'CASCADE' })
  @JoinColumn()
  profile: Profile;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 