import { ApiProperty } from '@nestjs/swagger';

export enum UserSystemEnum {
  SYSTEM = 'system',
  USER = 'user',
}

export class TicketMessageResponseDto {
  @ApiProperty({
    description: 'Message ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  @ApiProperty({
    description: 'Message content',
    example: 'Hello, how can I help you?'
  })
  content: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-04-22T12:00:00Z'
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Message creator type',
    type: () => String,
    enum: UserSystemEnum,
    example: UserSystemEnum.USER
  })
  createdBy: UserSystemEnum;
} 