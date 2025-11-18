import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '@/users/dto/user-response.dto';

export class ProfileResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ example: 'johndoe' })
  nickname: string;
  
  @ApiProperty({ example: 'I am a trader' })
  about: string;

  @ApiProperty({ example: 'USA' })
  nationality: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg' })
  avatarUrl: string;

  @ApiProperty({ example: 'https://instagram.com/username' })
  instagramUrl: string;

  @ApiProperty({ example: 'https://twitter.com/username' })
  twitterUrl: string;

  @ApiProperty({ example: 'https://linkedin.com/in/username' })
  linkedinUrl: string;

  @ApiProperty({ example: 'https://t.me/username' })
  telegramUrl: string;

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;

  @ApiProperty({ example: '2024-05-14T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-05-14T00:00:00.000Z' })
  updatedAt: Date;
}

export class AvatarUploadResponseDto {
  @ApiProperty({ example: 'https://example.com/avatar.jpg' })
  avatarUrl: string;

  @ApiProperty({ example: 'Avatar uploaded successfully' })
  message: string;
}


export class SocialMediaUpdateResponseDto {
  @ApiProperty({ example: 'Social media updated successfully' })
  message: string;
}

export class ProfileMessageResponseDto {
  @ApiProperty({ example: 'Operation completed successfully' })
  message: string;
} 