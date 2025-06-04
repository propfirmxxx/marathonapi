import { ApiProperty } from '@nestjs/swagger';
import { TicketPriority, TicketStatus } from '../entities/ticket.entity';
import { DepartmentResponseDto } from './department-response.dto';
import { TicketMessageResponseDto, UserSystemEnum } from './ticket-message-response.dto';

export class TicketResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ enum: TicketStatus })
  status: TicketStatus;

  @ApiProperty({ enum: TicketPriority })
  priority: TicketPriority;

  @ApiProperty({ type: () => DepartmentResponseDto })
  department: DepartmentResponseDto;

  @ApiProperty({ type: () => UserSystemEnum })
  createdBy: UserSystemEnum;

  @ApiProperty({ type: () => [TicketMessageResponseDto] })
  messages: TicketMessageResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ nullable: true })
  resolvedAt: Date;
} 