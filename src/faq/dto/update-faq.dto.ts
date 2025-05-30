import { IsString, IsOptional, IsBoolean, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateFaqDto {
  @ApiProperty({
    description: 'FAQ question',
    example: 'What is this service?',
    required: false
  })
  @IsString()
  @IsOptional()
  question?: string;

  @ApiProperty({
    description: 'FAQ answer',
    example: 'This is a service that helps users...',
    required: false
  })
  @IsString()
  @IsOptional()
  answer?: string;

  @ApiProperty({
    description: 'FAQ active status',
    example: true,
    required: false
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    description: 'FAQ display order',
    example: 1,
    required: false
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  order?: number;
} 