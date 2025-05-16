import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Patch,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateSocialMediaDto, UpdateSocialMediaDto } from './dto/social-media.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  ProfileResponseDto,
  AvatarUploadResponseDto,
  SocialMediaCreateResponseDto,
  SocialMediaUpdateResponseDto,
  MessageResponseDto,
} from './dto/profile-response.dto';

@ApiTags('Profile')
@ApiBearerAuth()
@Controller('profile')
@UseGuards(AuthGuard('jwt'))
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns the user profile',
    type: ProfileResponseDto
  })
  getProfile(@GetUser('id') userId: number) {
    return this.profileService.getProfile(userId);
  }

  @Put()
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ 
    status: 200, 
    description: 'Profile updated successfully',
    type: ProfileResponseDto
  })
  updateProfile(
    @GetUser('id') userId: number,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.profileService.updateProfile(userId, updateProfileDto);
  }

  @Post('avatar')
  @ApiOperation({ summary: 'Upload profile avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'Profile avatar image file (jpg, jpeg, png, gif)',
        },
      },
    },
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Avatar uploaded successfully',
    type: AvatarUploadResponseDto
  })
  @UseInterceptors(FileInterceptor('avatar'))
  uploadAvatar(
    @GetUser('id') userId: number,
    @UploadedFile() file: any,
  ) {
    return this.profileService.uploadAvatar(userId, file);
  }

  @Delete('avatar')
  @ApiOperation({ summary: 'Delete profile avatar' })
  @ApiResponse({ 
    status: 200, 
    description: 'Avatar deleted successfully',
    type: MessageResponseDto
  })
  deleteAvatar(@GetUser('id') userId: number) {
    return this.profileService.deleteAvatar(userId);
  }

  @Post('social-media')
  @ApiOperation({ summary: 'Add social media link' })
  @ApiResponse({ 
    status: 201, 
    description: 'Social media link added successfully',
    type: SocialMediaCreateResponseDto
  })
  createSocialMedia(
    @GetUser('id') userId: number,
    @Body() createSocialMediaDto: CreateSocialMediaDto,
  ) {
    return this.profileService.createSocialMedia(userId, createSocialMediaDto);
  }

  @Post('social-media/bulk')
  @ApiOperation({ summary: 'Add multiple social media links' })
  @ApiResponse({ 
    status: 201, 
    description: 'Social media links added successfully',
    type: [SocialMediaCreateResponseDto]
  })
  @ApiBody({
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['instagram', 'twitter', 'linkedin', 'facebook'] },
          url: { type: 'string' }
        }
      }
    }
  })
  createBulkSocialMedia(
    @GetUser('id') userId: number,
    @Body() socialMediaDtos: CreateSocialMediaDto[],
  ) {
    return this.profileService.createBulkSocialMedia(userId, socialMediaDtos);
  }

  @Put('social-media/:id')
  @ApiOperation({ summary: 'Update social media link' })
  @ApiParam({ name: 'id', description: 'Social media ID', type: 'string' })
  @ApiResponse({ 
    status: 200, 
    description: 'Social media link updated successfully',
    type: SocialMediaUpdateResponseDto
  })
  updateSocialMedia(
    @GetUser('id') userId: number,
    @Param('id') socialMediaId: string,
    @Body() updateSocialMediaDto: UpdateSocialMediaDto,
  ) {
    return this.profileService.updateSocialMedia(
      userId,
      socialMediaId,
      updateSocialMediaDto,
    );
  }

  @Patch('social-media')
  @ApiOperation({ summary: 'Update multiple social media links' })
  @ApiResponse({ 
    status: 200, 
    description: 'Social media links updated successfully',
    type: [SocialMediaUpdateResponseDto]
  })
  @ApiBody({
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          url: { type: 'string' }
        }
      }
    }
  })
  updateBulkSocialMedia(
    @GetUser('id') userId: number,
    @Body() updateSocialMediaDtos: { id: string; url: string }[],
  ) {
    return Promise.all(
      updateSocialMediaDtos.map(({ id, url }) =>
        this.profileService.updateSocialMedia(userId, id, { url })
      )
    );
  }

  @Delete('social-media/:id')
  @ApiOperation({ summary: 'Delete social media link' })
  @ApiParam({ name: 'id', description: 'Social media ID', type: 'string' })
  @ApiResponse({ 
    status: 200, 
    description: 'Social media link deleted successfully',
    type: MessageResponseDto
  })
  deleteSocialMedia(
    @GetUser('id') userId: number,
    @Param('id') socialMediaId: string,
  ) {
    return this.profileService.deleteSocialMedia(userId, socialMediaId);
  }

  @Put('change-password')
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ 
    status: 200, 
    description: 'Password changed successfully',
    type: MessageResponseDto
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Current password is incorrect',
    type: MessageResponseDto
  })
  changePassword(
    @GetUser('id') userId: number,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.profileService.changePassword(userId, changePasswordDto);
  }
} 