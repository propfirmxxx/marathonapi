import { ApiProperty } from '@nestjs/swagger';
import { TicketPriority, TicketStatus } from '../entities/ticket.entity';
import { DepartmentResponseDto } from './department-response.dto';
import { TicketMessageResponseDto, UserSystemEnum } from './ticket-message-response.dto';

export class TicketResponseDto {
  @ApiProperty({
    description: 'Ticket ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  @ApiProperty({
    description: 'Ticket title',
    example: 'Cannot access my account'
  })
  title: string;

  @ApiProperty({
    description: 'Ticket status',
    enum: TicketStatus,
    example: TicketStatus.OPEN
  })
  status: TicketStatus;

  @ApiProperty({
    description: 'Ticket priority',
    enum: TicketPriority,
    example: TicketPriority.HIGH
  })
  priority: TicketPriority;

  @ApiProperty({
    description: 'Department information',
    type: () => DepartmentResponseDto
  })
  department: DepartmentResponseDto;

  @ApiProperty({
    description: 'User who created the ticket',
    type: () => String,
    enum: UserSystemEnum,
    example: UserSystemEnum.USER
  })
  createdBy: UserSystemEnum;

  @ApiProperty({
    description: 'Ticket messages',
    type: () => [TicketMessageResponseDto],
    isArray: true
  })
  messages: TicketMessageResponseDto[];

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

  @ApiProperty({
    description: 'Resolution timestamp',
    example: '2024-04-22T13:00:00Z',
    nullable: true
  })
  resolvedAt: Date;
} 