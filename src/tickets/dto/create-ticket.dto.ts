import { IsString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { TicketPriority } from '../entities/ticket.entity';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTicketDto {
  @ApiProperty({ description: 'Title of the ticket' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'ID of the department this ticket belongs to' })
  @IsUUID()
  departmentId: string;

  @ApiProperty({ 
    description: 'Priority level of the ticket',
    enum: TicketPriority,
    required: false
  })
  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;
} 