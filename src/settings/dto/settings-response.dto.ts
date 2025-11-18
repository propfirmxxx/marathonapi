import { ApiProperty } from '@nestjs/swagger';
import {
  DateFormat,
  TimeFormat,
  ProfileVisibility,
} from '../entities/user-settings.entity';

export class SettingsResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the settings',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Date format preference',
    enum: DateFormat,
    example: DateFormat.DD_MM_YYYY,
  })
  dateFormat: DateFormat;

  @ApiProperty({
    description: 'Time format preference',
    enum: TimeFormat,
    example: TimeFormat.TWENTY_FOUR_HOUR,
  })
  timeFormat: TimeFormat;

  @ApiProperty({
    description: 'Timezone in IANA format',
    example: 'Asia/Tehran',
  })
  timezone: string;

  @ApiProperty({
    description: 'Enable email notifications',
    example: true,
  })
  emailNotificationsEnabled: boolean;

  @ApiProperty({
    description: 'Profile visibility setting',
    enum: ProfileVisibility,
    example: ProfileVisibility.PUBLIC,
  })
  profileVisibility: ProfileVisibility;

  @ApiProperty({
    description: 'Show social media links in profile',
    example: true,
  })
  showSocialMediaLinks: boolean;

  @ApiProperty({
    description: 'Settings creation date',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Settings last update date',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: Date;
}

