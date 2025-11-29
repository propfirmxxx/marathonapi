import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  Res,
  HttpStatus,
  HttpException,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { MinioService } from './minio.service';
import { ApiTags, ApiOperation, ApiConsumes, ApiBearerAuth, ApiQuery, ApiParam, ApiExcludeController } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

@ApiExcludeController()
@ApiTags('Storage')
@Controller('storage')
export class StorageController {
  constructor(private readonly minioService: MinioService) {}

  @Post('upload')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file to MinIO storage' })
  @ApiConsumes('multipart/form-data')
  async uploadFile(
    @UploadedFile() file: any,
    @Query('folder') folder?: string,
  ) {
    if (!file) {
      throw new HttpException('No file provided', HttpStatus.BAD_REQUEST);
    }

    try {
      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const fileName = `${uuidv4()}${fileExtension}`;
      const objectName = folder ? `${folder}/${fileName}` : fileName;

      // Upload to MinIO
      await this.minioService.uploadBuffer(objectName, file.buffer, {
        'Content-Type': file.mimetype,
        'Original-Name': file.originalname,
      });

      return {
        success: true,
        objectName,
        fileName,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        url: this.minioService.getPublicUrl(objectName),
      };
    } catch (error) {
      throw new HttpException(
        `Failed to upload file: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('download/*path') 
  @ApiOperation({ summary: 'Download a file from MinIO storage' })
  @ApiParam({ 
    name: 'path', 
    required: true, 
    description: 'File path to download (can include folders, e.g., folder1/subfolder/file.jpg)', 
    type: String 
  })
  @ApiQuery({ name: 'presigned', required: false, type: Boolean, description: 'Get presigned URL instead of direct download' })
  async downloadFile(
    @Param('path') objectName: string,
    @Query('presigned') presigned?: string,
    @Res() res?: Response,
  ) {
    try {
      // Check if file exists
      const exists = await this.minioService.fileExists(objectName);
      if (!exists) {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      }

      // If presigned URL requested, return it
      if (presigned === 'true') {
        const url = await this.minioService.getPresignedUrl(objectName);
        return { url };
      }

      // Otherwise, stream the file
      const buffer = await this.minioService.getFileBuffer(objectName);
      const metadata = await this.minioService.getFileMetadata(objectName);

      res.setHeader('Content-Type', metadata.metaData?.['content-type'] || 'application/octet-stream');
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Content-Disposition', `attachment; filename="${objectName}"`);

      return res.send(buffer);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to download file: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('presigned-url/*path')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a presigned URL for temporary access to a file' })
  @ApiParam({ 
    name: 'path', 
    required: true, 
    description: 'File path (can include folders, e.g., folder1/subfolder/file.jpg)', 
    type: String 
  })
  @ApiQuery({ name: 'expiry', required: false, type: Number, description: 'Expiry time in seconds (default: 7 days)' })
  async getPresignedUrl(
    @Param('path') objectName: string,
    @Query('expiry') expiry?: string,
  ) {
    try {
      const exists = await this.minioService.fileExists(objectName);
      if (!exists) {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      }

      const expirySeconds = expiry ? parseInt(expiry, 10) : 7 * 24 * 60 * 60;
      const url = await this.minioService.getPresignedUrl(objectName, expirySeconds);

      return {
        success: true,
        url,
        objectName,
        expiry: expirySeconds,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to generate presigned URL: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('presigned-put-url')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a presigned URL for uploading a file' })
  @ApiQuery({ name: 'objectName', required: true, type: String, description: 'Object name/path' })
  @ApiQuery({ name: 'expiry', required: false, type: Number, description: 'Expiry time in seconds (default: 1 hour)' })
  async getPresignedPutUrl(
    @Query('objectName') objectName: string,
    @Query('expiry') expiry?: string,
  ) {
    try {
      const expirySeconds = expiry ? parseInt(expiry, 10) : 60 * 60;
      const url = await this.minioService.getPresignedPutUrl(objectName, expirySeconds);

      return {
        success: true,
        url,
        objectName,
        expiry: expirySeconds,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to generate presigned PUT URL: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('*path')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a file from MinIO storage' })
  @ApiParam({ 
    name: 'path', 
    required: true, 
    description: 'File path to delete (can include folders, e.g., folder1/subfolder/file.jpg)', 
    type: String 
  })
  async deleteFile(@Param('path') objectName: string) {
    try {
      const exists = await this.minioService.fileExists(objectName);
      if (!exists) {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      }

      await this.minioService.deleteFile(objectName);

      return {
        success: true,
        message: 'File deleted successfully',
        objectName,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to delete file: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('list')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List objects in the storage bucket' })
  @ApiQuery({ name: 'prefix', required: false, type: String, description: 'Prefix to filter objects' })
  @ApiQuery({ name: 'recursive', required: false, type: Boolean, description: 'List recursively (default: true)' })
  async listObjects(
    @Query('prefix') prefix?: string,
    @Query('recursive') recursive?: string,
  ) {
    try {
      const recursiveFlag = recursive !== 'false';
      const objects = await this.minioService.listObjects(prefix, recursiveFlag);

      return {
        success: true,
        count: objects.length,
        objects: objects.map((obj) => {
          // BucketItem can be either an object (with name) or a prefix (with prefix property)
          if ('name' in obj && obj.name) {
            return {
              name: obj.name,
              size: obj.size,
              lastModified: obj.lastModified,
              etag: obj.etag,
            };
          } else if ('prefix' in obj && obj.prefix) {
            return {
              prefix: obj.prefix,
            };
          }
          return obj;
        }),
      };
    } catch (error) {
      throw new HttpException(
        `Failed to list objects: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('info/*path')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get file metadata' })
  @ApiParam({ 
    name: 'path', 
    required: true, 
    description: 'File path (can include folders, e.g., folder1/subfolder/file.jpg)', 
    type: String 
  })
  async getFileInfo(@Param('path') objectName: string) {
    try {
      const exists = await this.minioService.fileExists(objectName);
      if (!exists) {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      }

      const metadata = await this.minioService.getFileMetadata(objectName);

      return {
        success: true,
        objectName,
        size: metadata.size,
        lastModified: metadata.lastModified,
        etag: metadata.etag,
        contentType: metadata.metaData?.['content-type'],
        metadata: metadata.metaData,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to get file info: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

