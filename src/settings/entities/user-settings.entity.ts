import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

export enum DateFormat {
  DD_MM_YYYY = 'DD/MM/YYYY',
  MM_DD_YYYY = 'MM/DD/YYYY',
  YYYY_MM_DD = 'YYYY-MM-DD',
  DD_MMM_YYYY = 'DD MMM YYYY',
}

export enum TimeFormat {
  TWELVE_HOUR = '12h',
  TWENTY_FOUR_HOUR = '24h',
}

export enum ProfileVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

@Entity('user_settings')
export class UserSettings {
  @ApiProperty({
    description: 'The unique identifier of the settings',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'The user ID this settings belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ type: 'uuid', unique: true })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({
    description: 'Date format preference',
    enum: DateFormat,
    example: DateFormat.DD_MM_YYYY,
    default: DateFormat.DD_MM_YYYY,
  })
  @Column({
    type: 'enum',
    enum: DateFormat,
    default: DateFormat.DD_MM_YYYY,
  })
  dateFormat: DateFormat;

  @ApiProperty({
    description: 'Time format preference',
    enum: TimeFormat,
    example: TimeFormat.TWENTY_FOUR_HOUR,
    default: TimeFormat.TWENTY_FOUR_HOUR,
  })
  @Column({
    type: 'enum',
    enum: TimeFormat,
    default: TimeFormat.TWENTY_FOUR_HOUR,
  })
  timeFormat: TimeFormat;

  @ApiProperty({
    description: 'Timezone in IANA format',
    example: 'Asia/Tehran',
    default: 'UTC',
  })
  @Column({ default: 'UTC' })
  timezone: string;

  @ApiProperty({
    description: 'Enable email notifications',
    example: true,
    default: true,
  })
  @Column({ default: true })
  emailNotificationsEnabled: boolean;

  @ApiProperty({
    description: 'Enable in-app notifications',
    example: true,
    default: true,
  })
  @Column({ default: true })
  inAppNotificationsEnabled: boolean;

  @ApiProperty({
    description: 'Profile visibility setting',
    enum: ProfileVisibility,
    example: ProfileVisibility.PUBLIC,
    default: ProfileVisibility.PUBLIC,
  })
  @Column({
    type: 'enum',
    enum: ProfileVisibility,
    default: ProfileVisibility.PUBLIC,
  })
  profileVisibility: ProfileVisibility;

  @ApiProperty({
    description: 'Show social media links in profile',
    example: true,
    default: true,
  })
  @Column({ default: true })
  showSocialMediaLinks: boolean;

  @ApiProperty({
    description: 'Show trading information in profile',
    example: true,
    default: true,
  })
  @Column({ default: true })
  showTradingInfo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

