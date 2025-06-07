import { ApiProperty } from '@nestjs/swagger';

export enum UserSystemEnum {
  SYSTEM = 'system',
  USER = 'user',
}

export class TicketMessageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ enum: UserSystemEnum })
  createdBy: UserSystemEnum;
} 