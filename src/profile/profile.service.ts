import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { SocialMedia } from './entities/social-media.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateSocialMediaDto, UpdateSocialMediaDto } from './dto/social-media.dto';
import { CloudStorageService } from '../services/cloud-storage.service';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @InjectRepository(SocialMedia)
    private socialMediaRepository: Repository<SocialMedia>,
    private cloudStorageService: CloudStorageService,
  ) {}

  async getProfile(userId: number): Promise<Profile> {
    const profile = await this.profileRepository.findOne({
      where: { user: { id: userId } },
      relations: ['socialMedias'],
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return profile;
  }

  async updateProfile(userId: number, updateProfileDto: UpdateProfileDto): Promise<Profile> {
    const profile = await this.getProfile(userId);
    Object.assign(profile, updateProfileDto);
    return this.profileRepository.save(profile);
  }

  async uploadAvatar(userId: number, file: any): Promise<Profile> {
    const profile = await this.getProfile(userId);
    
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

  async deleteAvatar(userId: number): Promise<Profile> {
    const profile = await this.getProfile(userId);
    
    if (profile.avatarUrl) {
      await this.cloudStorageService.deleteImage(profile.avatarUrl);
      profile.avatarUrl = null;
      return this.profileRepository.save(profile);
    }

    return profile;
  }

  async createSocialMedia(userId: number, createSocialMediaDto: CreateSocialMediaDto): Promise<SocialMedia> {
    const profile = await this.getProfile(userId);
    const socialMedia = this.socialMediaRepository.create({
      ...createSocialMediaDto,
      profile,
    });
    return this.socialMediaRepository.save(socialMedia);
  }

  async updateSocialMedia(
    userId: number,
    socialMediaId: string,
    updateSocialMediaDto: UpdateSocialMediaDto,
  ): Promise<SocialMedia> {
    const socialMedia = await this.socialMediaRepository.findOne({
      where: { id: socialMediaId, profile: { user: { id: userId } } },
    });

    if (!socialMedia) {
      throw new NotFoundException('Social media not found');
    }

    Object.assign(socialMedia, updateSocialMediaDto);
    return this.socialMediaRepository.save(socialMedia);
  }

  async deleteSocialMedia(userId: number, socialMediaId: string): Promise<void> {
    const socialMedia = await this.socialMediaRepository.findOne({
      where: { id: socialMediaId, profile: { user: { id: userId } } },
    });

    if (!socialMedia) {
      throw new NotFoundException('Social media not found');
    }

    await this.socialMediaRepository.remove(socialMedia);
  }
} 