import { ApiProperty } from '@nestjs/swagger';

export class PaginatedResponseDto<T> {
  @ApiProperty({
    description: 'Array of items',
    isArray: true,
    type: 'object',
    additionalProperties: true
  })
  data: T[];

  @ApiProperty({
    description: 'Total number of items',
    example: 100,
    type: Number
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
    type: Number
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    type: Number
  })
  limit: number;
} 