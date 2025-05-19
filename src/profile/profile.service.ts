import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { UpdateProfileDto, UpdateSocialMediaDto } from './dto/update-profile.dto';
import { CloudStorageService } from '../services/cloud-storage.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private cloudStorageService: CloudStorageService,
  ) {}

  async getProfile(uid: string): Promise<Profile> {
    const profile = await this.profileRepository.findOne({
      where: { user: { uid } },
      relations: ['user'],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        nickname: true,
        about: true,
        nationality: true,
        avatarUrl: true,
        instagramUrl: true,
        twitterUrl: true,
        linkedinUrl: true,
        telegramUrl: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        user: {
          id: true,
          email: true,
          role: true
        }
      }
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return profile;
  }

  async updateProfile(uid: string, updateProfileDto: UpdateProfileDto): Promise<Profile> {
    const profile = await this.getProfile(uid);
    Object.assign(profile, updateProfileDto);
    return this.profileRepository.save(profile);
  }

  async updateSocialMedia(uid: string, updateSocialMediaDto: UpdateSocialMediaDto): Promise<Profile> {
    const profile = await this.getProfile(uid);
    Object.assign(profile, updateSocialMediaDto);
    return this.profileRepository.save(profile);
  }

  async uploadAvatar(uid: string, file: any): Promise<Profile> {
    const profile = await this.getProfile(uid);
    
    // Delete old avatar if exists
    if (profile.avatarUrl) {
      await this.cloudStorageService.deleteImage(profile.avatarUrl);
    }

    // Convert file buffer to base64
    const base64Image = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${file.originalname}`;

    // Upload to cloud storage
    const imageUrl = await this.cloudStorageService.uploadBase64Image(base64Image, fileName);
    
    profile.avatarUrl = imageUrl;
    return this.profileRepository.save(profile);
  }

  async deleteAvatar(uid: string): Promise<{ message: string }> {
    const profile = await this.getProfile(uid);
    
    if (!profile.avatarUrl) {
      throw new NotFoundException('Avatar not found');
    }

    await this.cloudStorageService.deleteImage(profile.avatarUrl);
    profile.avatarUrl = null;
    await this.profileRepository.save(profile);

    return { message: 'Avatar deleted successfully' };
  }

  async changePassword(uid: string, changePasswordDto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { uid },
      select: ['id', 'password']
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await user.validatePassword(changePasswordDto.currentPassword);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.password = changePasswordDto.newPassword;
    await this.userRepository.save(user);

    return { message: 'Password changed successfully' };
  }
} 