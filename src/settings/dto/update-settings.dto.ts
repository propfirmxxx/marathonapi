import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsBoolean,
  IsString,
  IsOptional,
  IsNotEmpty,
  Matches,
} from 'class-validator';
import {
  DateFormat,
  TimeFormat,
  ProfileVisibility,
} from '../entities/user-settings.entity';

export class UpdateSettingsDto {
  @ApiProperty({
    description: 'Date format preference',
    enum: DateFormat,
    example: DateFormat.DD_MM_YYYY,
    required: false,
  })
  @IsOptional()
  @IsEnum(DateFormat)
  dateFormat?: DateFormat;

  @ApiProperty({
    description: 'Time format preference',
    enum: TimeFormat,
    example: TimeFormat.TWENTY_FOUR_HOUR,
    required: false,
  })
  @IsOptional()
  @IsEnum(TimeFormat)
  timeFormat?: TimeFormat;

  @ApiProperty({
    description: 'Timezone in IANA format (e.g., Asia/Tehran, UTC)',
    example: 'Asia/Tehran',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  timezone?: string;

  @ApiProperty({
    description: 'Enable email notifications',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  emailNotificationsEnabled?: boolean;

  @ApiProperty({
    description: 'Profile visibility setting',
    enum: ProfileVisibility,
    example: ProfileVisibility.PUBLIC,
    required: false,
  })
  @IsOptional()
  @IsEnum(ProfileVisibility)
  profileVisibility?: ProfileVisibility;

  @ApiProperty({
    description: 'Show social media links in profile',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  showSocialMediaLinks?: boolean;

}

