import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { UpdateProfileDto, UpdateSocialMediaDto } from './dto/update-profile.dto';
import { CloudStorageService } from '../services/cloud-storage.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { User } from '../users/entities/user.entity';
import { NotificationService } from '../notifications/notification.service';
import { VirtualWalletService } from '@/virtual-wallet/virtual-wallet.service';
import { MinioService } from '../storage/minio.service';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cloudStorageService: CloudStorageService,
    private readonly notificationService: NotificationService,
    private readonly virtualWalletService: VirtualWalletService,
    private readonly minioService: MinioService,
  ) {}

  async getProfile(id: string): Promise<Profile & { unreadNotificationsCount: number }> {
    const virtualWallet = await this.virtualWalletService.getWalletByUserId(id);
    const balance = virtualWallet?.balance ?? 0;
    const profile = await this.profileRepository.findOne({
      where: { user: { id } },
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
          role: true,
          isBanned: true,
          banReason: true,
          bannedAt: true,
          bannedUntil: true
        }
      }
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const unreadNotificationsCount = await this.notificationService.getUnreadCount(id);

    return {
      ...profile,
      unreadNotificationsCount,
      balance
    };
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
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only image files (jpg, jpeg, png, gif, webp) are allowed.');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds maximum allowed size of 5MB');
    }

    const profile = await this.getProfile(uid);
    
    // Delete old avatar if exists
    if (profile.avatarUrl) {
      try {
        // Extract object name from URL if it's a MinIO URL, otherwise try to delete from old storage
        const oldObjectName = this.extractObjectNameFromUrl(profile.avatarUrl);
        if (oldObjectName) {
          await this.minioService.deleteFile(oldObjectName);
        } else {
          // Fallback to old cloud storage service
          await this.cloudStorageService.deleteImage(profile.avatarUrl);
        }
      } catch (error) {
        // Ignore errors when deleting old avatar (might not exist)
      }
    }

    // Generate unique filename for avatar
    const fileExtension = file.originalname.split('.').pop() || 'jpg';
    const objectName = `avatars/${uid}/${Date.now()}-${Math.round(Math.random() * 1e9)}.${fileExtension}`;

    // Upload to MinIO
    await this.minioService.uploadBuffer(objectName, file.buffer, {
      'Content-Type': file.mimetype,
      'Original-Name': file.originalname,
      'User-Id': uid,
    });

    // Store the public URL or presigned URL
    // For avatars, we'll use presigned URL with long expiry (1 year) or public URL if bucket is public
    const avatarUrl = await this.minioService.getPresignedUrl(objectName, 365 * 24 * 60 * 60); // 1 year
    
    profile.avatarUrl = avatarUrl;
    return this.profileRepository.save(profile);
  }

  /**
   * Extract object name from MinIO URL
   * Handles both public URLs and presigned URLs
   * Format: http://host:port/bucket-name/object-name or presigned URL with object name in path
   */
  private extractObjectNameFromUrl(url: string): string | null {
    if (!url) return null;
    
    try {
      const urlObj = new URL(url);
      // MinIO URLs format: http://host:port/bucket-name/object-name
      // Pathname will be like: /bucket-name/avatars/user-id/filename.jpg
      const pathParts = urlObj.pathname.split('/').filter(p => p);
      
      // Skip bucket name (first part) and get the rest as object name
      if (pathParts.length > 1) {
        return pathParts.slice(1).join('/');
      }
      
      return null;
    } catch {
      // If URL parsing fails, it might be an old format URL
      // Try to extract from common patterns or return null
      return null;
    }
  }

  async deleteAvatar(uid: string): Promise<{ message: string }> {
    const profile = await this.getProfile(uid);
    
    if (!profile.avatarUrl) {
      throw new NotFoundException('Avatar not found');
    }

    try {
      // Extract object name from URL
      const objectName = this.extractObjectNameFromUrl(profile.avatarUrl);
      if (objectName) {
        // Delete from MinIO
        await this.minioService.deleteFile(objectName);
      } else {
        // Fallback to old cloud storage service
        await this.cloudStorageService.deleteImage(profile.avatarUrl);
      }
    } catch (error) {
      // Log error but continue to remove avatar URL from profile
      console.error('Error deleting avatar from storage:', error);
    }

    profile.avatarUrl = null;
    await this.profileRepository.save(profile);

    return { message: 'Avatar deleted successfully' };
  }

  async changePassword(id: string, changePasswordDto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { id },
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

  async getBalance(id: string): Promise<{ balance: number }> {
    const profile = await this.profileRepository.findOne({
      where: { user: { id } },
      select: ['balance']
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return { balance: profile.balance };
  }

  async addBalance(id: string, amount: number): Promise<{ balance: number }> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const profile = await this.profileRepository.findOne({
      where: { user: { id } }
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    profile.balance = Number(profile.balance) + amount;
    await this.profileRepository.save(profile);

    return { balance: profile.balance };
  }

  async subtractBalance(id: string, amount: number): Promise<{ balance: number }> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const profile = await this.profileRepository.findOne({
      where: { user: { id } }
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    if (Number(profile.balance) < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    profile.balance = Number(profile.balance) - amount;
    await this.profileRepository.save(profile);

    return { balance: profile.balance };
  }
} 