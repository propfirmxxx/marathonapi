import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTicketMessageDto {
  @ApiProperty({ description: 'Content of the message' })
  @IsString()
  content: string;
} 