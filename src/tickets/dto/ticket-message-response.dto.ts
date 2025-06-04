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

  @ApiProperty({ type: () => UserSystemEnum })
  createdBy: UserSystemEnum;
} 