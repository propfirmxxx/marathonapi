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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateSocialMediaDto, UpdateSocialMediaDto } from './dto/social-media.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';

@ApiTags('Profile')
@ApiBearerAuth()
@Controller('profile')
@UseGuards(AuthGuard('jwt'))
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'Returns the user profile' })
  getProfile(@GetUser('id') userId: number) {
    return this.profileService.getProfile(userId);
  }

  @Put()
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
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
  @ApiResponse({ status: 201, description: 'Avatar uploaded successfully' })
  @UseInterceptors(FileInterceptor('avatar'))
  uploadAvatar(
    @GetUser('id') userId: number,
    @UploadedFile() file: any,
  ) {
    return this.profileService.uploadAvatar(userId, file);
  }

  @Delete('avatar')
  @ApiOperation({ summary: 'Delete profile avatar' })
  @ApiResponse({ status: 200, description: 'Avatar deleted successfully' })
  deleteAvatar(@GetUser('id') userId: number) {
    return this.profileService.deleteAvatar(userId);
  }

  @Post('social-media')
  @ApiOperation({ summary: 'Add social media link' })
  @ApiResponse({ status: 201, description: 'Social media link added successfully' })
  createSocialMedia(
    @GetUser('id') userId: number,
    @Body() createSocialMediaDto: CreateSocialMediaDto,
  ) {
    return this.profileService.createSocialMedia(userId, createSocialMediaDto);
  }

  @Put('social-media/:id')
  @ApiOperation({ summary: 'Update social media link' })
  @ApiParam({ name: 'id', description: 'Social media ID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Social media link updated successfully' })
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

  @Delete('social-media/:id')
  @ApiOperation({ summary: 'Delete social media link' })
  @ApiParam({ name: 'id', description: 'Social media ID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Social media link deleted successfully' })
  deleteSocialMedia(
    @GetUser('id') userId: number,
    @Param('id') socialMediaId: string,
  ) {
    return this.profileService.deleteSocialMedia(userId, socialMediaId);
  }
} 