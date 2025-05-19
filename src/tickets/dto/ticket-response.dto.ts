import { ApiProperty } from '@nestjs/swagger';
import { TicketStatus, TicketPriority } from '../entities/ticket.entity';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import { DepartmentResponseDto } from './department-response.dto';
import { TicketMessageResponseDto } from './ticket-message-response.dto';

export class TicketResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: TicketStatus })
  status: TicketStatus;

  @ApiProperty({ enum: TicketPriority })
  priority: TicketPriority;

  @ApiProperty({ type: () => DepartmentResponseDto })
  department: DepartmentResponseDto;

  @ApiProperty({ type: () => UserResponseDto })
  createdBy: UserResponseDto;

  @ApiProperty({ type: () => [TicketMessageResponseDto] })
  messages: TicketMessageResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ nullable: true })
  resolvedAt: Date;
} 