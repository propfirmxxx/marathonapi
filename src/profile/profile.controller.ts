import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Patch,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProfileService } from './profile.service';
import { UpdateProfileDto, UpdateSocialMediaDto } from './dto/update-profile.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  ProfileResponseDto,
  AvatarUploadResponseDto,
  MessageResponseDto,
  SocialMediaUpdateResponseDto,
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

  @Put('social-media')
  @ApiOperation({ summary: 'Update user social media' })
  @ApiResponse({ 
    status: 200, 
    description: 'Social media updated successfully',
    type: SocialMediaUpdateResponseDto
  })
  updateSocialMedia(
    @GetUser('id') userId: number,
    @Body() updateSocialMediaDto: UpdateSocialMediaDto,
  ) {
    return this.profileService.updateSocialMedia(userId, updateSocialMediaDto);
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