import { IsString, IsEnum, IsUrl, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SocialMediaType } from '../entities/social-media.entity';

export class CreateSocialMediaDto {
  @ApiProperty({ enum: SocialMediaType, description: 'Type of social media platform' })
  @IsEnum(SocialMediaType)
  type: SocialMediaType;

  @ApiProperty({ description: 'URL of the social media profile' })
  @IsUrl()
  url: string;
}

export class UpdateSocialMediaDto {
  @ApiPropertyOptional({ description: 'URL of the social media profile' })
  @IsUrl()
  @IsOptional()
  url?: string;
} 