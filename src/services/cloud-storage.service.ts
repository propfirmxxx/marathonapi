import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class CloudStorageService {
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('CLOUD_STORAGE_API_URL');
    this.apiKey = this.configService.get<string>('CLOUD_STORAGE_API_KEY');
  }

  async uploadBase64Image(base64Image: string, fileName: string): Promise<string> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/upload`,
        {
          file: base64Image,
          fileName,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data.url;
    } catch (error) {
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }

  async deleteImage(imageUrl: string): Promise<void> {
    try {
      await axios.delete(`${this.apiUrl}/delete`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        data: { url: imageUrl },
      });
    } catch (error) {
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  }
} 