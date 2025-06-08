import { ApiProperty } from '@nestjs/swagger';

export class FaqResponseDto {
  @ApiProperty({
    description: 'FAQ ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  @ApiProperty({
    description: 'FAQ question',
    example: 'What is this service?'
  })
  question: string;

  @ApiProperty({
    description: 'FAQ answer',
    example: 'This is a service that helps users...'
  })
  answer: string;

  @ApiProperty({
    description: 'FAQ active status',
    example: true
  })
  isActive: boolean;

  @ApiProperty({
    description: 'FAQ display order',
    example: 1
  })
  order: number;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-04-22T12:00:00Z'
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-04-22T12:00:00Z'
  })
  updatedAt: Date;
}

export class FaqListResponseDto {
  @ApiProperty({
    description: 'List of FAQs',
    type: [FaqResponseDto]
  })
  items: FaqResponseDto[];
} 