import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFaqDto {
  @ApiProperty({
    description: 'FAQ question',
    example: 'What is this service?'
  })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({
    description: 'FAQ answer',
    example: 'This is a service that helps users...'
  })
  @IsString()
  @IsNotEmpty()
  answer: string;

  @ApiProperty({
    description: 'FAQ display order',
    example: 1,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;
} 