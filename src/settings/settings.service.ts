import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSettings } from './entities/user-settings.entity';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsResponseDto } from './dto/settings-response.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(UserSettings)
    private readonly settingsRepository: Repository<UserSettings>,
  ) {}

  /**
   * Get user settings or create default if not exists
   */
  async getOrCreateSettings(userId: string): Promise<UserSettings> {
    let settings = await this.settingsRepository.findOne({
      where: { userId },
    });

    if (!settings) {
      settings = this.settingsRepository.create({
        userId,
      });
      settings = await this.settingsRepository.save(settings);
    }

    return settings;
  }

  /**
   * Get user settings
   */
  async getSettings(userId: string): Promise<SettingsResponseDto> {
    const settings = await this.getOrCreateSettings(userId);
    return this.mapToResponseDto(settings);
  }

  /**
   * Update user settings
   */
  async updateSettings(
    userId: string,
    updateDto: UpdateSettingsDto,
  ): Promise<SettingsResponseDto> {
    let settings = await this.settingsRepository.findOne({
      where: { userId },
    });

    if (!settings) {
      settings = this.settingsRepository.create({
        userId,
        ...updateDto,
      });
    } else {
      Object.assign(settings, updateDto);
    }

    settings = await this.settingsRepository.save(settings);
    return this.mapToResponseDto(settings);
  }

  /**
   * Map entity to response DTO
   */
  private mapToResponseDto(settings: UserSettings): SettingsResponseDto {
    return {
      id: settings.id,
      dateFormat: settings.dateFormat,
      timeFormat: settings.timeFormat,
      timezone: settings.timezone,
      emailNotificationsEnabled: settings.emailNotificationsEnabled,
      profileVisibility: settings.profileVisibility,
      showSocialMediaLinks: settings.showSocialMediaLinks,
      marathonAnnouncementsEmailEnabled: settings.marathonAnnouncementsEmailEnabled,
      marathonAnnouncementsSmsEnabled: settings.marathonAnnouncementsSmsEnabled,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }
}

