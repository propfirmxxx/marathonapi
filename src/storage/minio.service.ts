import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, BucketItem, BucketItemStat } from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private minioClient: Client;
  private readonly bucketName: string;
  private readonly endpoint: string;
  private readonly useSSL: boolean;
  private readonly port: number;

  constructor(private configService: ConfigService) {
    this.endpoint = this.configService.get<string>('MINIO_ENDPOINT') || 'localhost';
    this.port = parseInt(this.configService.get<string>('MINIO_PORT') || '9000', 10);
    this.useSSL = this.configService.get<string>('MINIO_USE_SSL') === 'true';
    this.bucketName = this.configService.get<string>('MINIO_BUCKET') || 'marathon-uploads';

    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY') || 'minioadmin';
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY') || 'minioadmin';

    this.minioClient = new Client({
      endPoint: this.endpoint,
      port: this.port,
      useSSL: this.useSSL,
      accessKey,
      secretKey,
    });
  }

  async onModuleInit() {
    await this.ensureBucketExists();
  }

  /**
   * Ensure the bucket exists, create it if it doesn't
   */
  private async ensureBucketExists(): Promise<void> {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(`Bucket ${this.bucketName} created successfully`);
      } else {
        this.logger.log(`Bucket ${this.bucketName} already exists`);
      }
    } catch (error) {
      this.logger.error(`Error ensuring bucket exists: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Upload a file to MinIO
   * @param objectName The name/path of the object in the bucket
   * @param filePath Path to the file to upload
   * @param metadata Optional metadata
   * @returns Promise with the object name
   */
  async uploadFile(
    objectName: string,
    filePath: string,
    metadata?: Record<string, string>,
  ): Promise<string> {
    try {
      await this.minioClient.fPutObject(this.bucketName, objectName, filePath, metadata);
      this.logger.log(`File uploaded successfully: ${objectName}`);
      return objectName;
    } catch (error) {
      this.logger.error(`Error uploading file: ${error.message}`, error.stack);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Upload a buffer to MinIO
   * @param objectName The name/path of the object in the bucket
   * @param buffer Buffer containing file data
   * @param metadata Optional metadata
   * @returns Promise with the object name
   */
  async uploadBuffer(
    objectName: string,
    buffer: Buffer,
    metadata?: Record<string, string>,
  ): Promise<string> {
    try {
      await this.minioClient.putObject(this.bucketName, objectName, buffer, buffer.length, metadata);
      this.logger.log(`Buffer uploaded successfully: ${objectName}`);
      return objectName;
    } catch (error) {
      this.logger.error(`Error uploading buffer: ${error.message}`, error.stack);
      throw new Error(`Failed to upload buffer: ${error.message}`);
    }
  }

  /**
   * Download a file from MinIO
   * @param objectName The name/path of the object in the bucket
   * @param filePath Path where to save the file
   * @returns Promise
   */
  async downloadFile(objectName: string, filePath: string): Promise<void> {
    try {
      await this.minioClient.fGetObject(this.bucketName, objectName, filePath);
      this.logger.log(`File downloaded successfully: ${objectName}`);
    } catch (error) {
      this.logger.error(`Error downloading file: ${error.message}`, error.stack);
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  /**
   * Get a file as buffer from MinIO
   * @param objectName The name/path of the object in the bucket
   * @returns Promise with the file buffer
   */
  async getFileBuffer(objectName: string): Promise<Buffer> {
    try {
      const dataStream = await this.minioClient.getObject(this.bucketName, objectName);
      const chunks: Buffer[] = [];

      return new Promise((resolve, reject) => {
        dataStream.on('data', (chunk) => chunks.push(chunk));
        dataStream.on('end', () => resolve(Buffer.concat(chunks)));
        dataStream.on('error', (error) => reject(error));
      });
    } catch (error) {
      this.logger.error(`Error getting file buffer: ${error.message}`, error.stack);
      throw new Error(`Failed to get file buffer: ${error.message}`);
    }
  }

  /**
   * Get a presigned URL for temporary access to an object
   * @param objectName The name/path of the object in the bucket
   * @param expiry Expiry time in seconds (default: 7 days)
   * @returns Promise with the presigned URL
   */
  async getPresignedUrl(objectName: string, expiry: number = 7 * 24 * 60 * 60): Promise<string> {
    try {
      const url = await this.minioClient.presignedGetObject(this.bucketName, objectName, expiry);
      return url;
    } catch (error) {
      this.logger.error(`Error generating presigned URL: ${error.message}`, error.stack);
      throw new Error(`Failed to generate presigned URL: ${error.message}`);
    }
  }

  /**
   * Get a presigned URL for uploading
   * @param objectName The name/path of the object in the bucket
   * @param expiry Expiry time in seconds (default: 1 hour)
   * @returns Promise with the presigned URL
   */
  async getPresignedPutUrl(objectName: string, expiry: number = 60 * 60): Promise<string> {
    try {
      const url = await this.minioClient.presignedPutObject(this.bucketName, objectName, expiry);
      return url;
    } catch (error) {
      this.logger.error(`Error generating presigned PUT URL: ${error.message}`, error.stack);
      throw new Error(`Failed to generate presigned PUT URL: ${error.message}`);
    }
  }

  /**
   * Delete a file from MinIO
   * @param objectName The name/path of the object in the bucket
   * @returns Promise
   */
  async deleteFile(objectName: string): Promise<void> {
    try {
      await this.minioClient.removeObject(this.bucketName, objectName);
      this.logger.log(`File deleted successfully: ${objectName}`);
    } catch (error) {
      this.logger.error(`Error deleting file: ${error.message}`, error.stack);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Check if a file exists
   * @param objectName The name/path of the object in the bucket
   * @returns Promise with boolean indicating if file exists
   */
  async fileExists(objectName: string): Promise<boolean> {
    try {
      await this.minioClient.statObject(this.bucketName, objectName);
      return true;
    } catch (error: any) {
      if (error?.code === 'NotFound' || error?.message?.includes('Not Found')) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file metadata
   * @param objectName The name/path of the object in the bucket
   * @returns Promise with file metadata
   */
  async getFileMetadata(objectName: string): Promise<BucketItemStat> {
    try {
      const stat = await this.minioClient.statObject(this.bucketName, objectName);
      return stat;
    } catch (error) {
      this.logger.error(`Error getting file metadata: ${error.message}`, error.stack);
      throw new Error(`Failed to get file metadata: ${error.message}`);
    }
  }

  /**
   * List objects in the bucket
   * @param prefix Optional prefix to filter objects
   * @param recursive Whether to list recursively
   * @returns Promise with list of objects
   */
  async listObjects(prefix?: string, recursive: boolean = true): Promise<BucketItem[]> {
    try {
      const objectsList: BucketItem[] = [];
      const stream = this.minioClient.listObjects(this.bucketName, prefix, recursive);

      return new Promise((resolve, reject) => {
        stream.on('data', (obj: BucketItem) => {
          // BucketItem can be either an object (with name) or a prefix (with prefix property)
          objectsList.push(obj);
        });
        stream.on('end', () => resolve(objectsList));
        stream.on('error', (error) => reject(error));
      });
    } catch (error) {
      this.logger.error(`Error listing objects: ${error.message}`, error.stack);
      throw new Error(`Failed to list objects: ${error.message}`);
    }
  }

  /**
   * Get the public URL for an object (if bucket is public)
   * @param objectName The name/path of the object in the bucket
   * @returns The public URL
   */
  getPublicUrl(objectName: string): string {
    const protocol = this.useSSL ? 'https' : 'http';
    return `${protocol}://${this.endpoint}:${this.port}/${this.bucketName}/${objectName}`;
  }
}

