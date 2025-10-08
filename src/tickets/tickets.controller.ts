import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { CreateTicketMessageDto } from './dto/create-ticket-message.dto';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '@/auth/guards/admin.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DepartmentResponseDto } from './dto/department-response.dto';
import { TicketResponseDto } from './dto/ticket-response.dto';
import { TicketMessageResponseDto } from './dto/ticket-message-response.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@ApiTags('tickets')
@ApiBearerAuth()
@Controller('tickets')
@UseGuards(AuthGuard('jwt'))
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @ApiOperation({ summary: 'Create a new department' })
  @ApiResponse({ 
    status: 201, 
    description: 'Department created successfully',
    type: DepartmentResponseDto 
  })
  @UseGuards(AdminGuard)
  @Post('departments')
  createDepartment(@Body() createDepartmentDto: CreateDepartmentDto): Promise<DepartmentResponseDto> {
    return this.ticketsService.createDepartment(createDepartmentDto);
  }

  @ApiOperation({ summary: 'Get all departments (paginated)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Return active departments paginated',
    type: PaginatedResponseDto<DepartmentResponseDto>
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Get('departments')
  findAllDepartments(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginatedResponseDto<DepartmentResponseDto>> {
    return this.ticketsService.findAllDepartments(page, limit);
  }

  @ApiOperation({ summary: 'Get department by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Return department details',
    type: DepartmentResponseDto
  })
  @ApiResponse({ status: 404, description: 'Department not found' })
  @UseGuards(AdminGuard)
  @Get('departments/:id')
  findDepartment(@Param('id') id: string): Promise<DepartmentResponseDto> {
    return this.ticketsService.findDepartment(id);
  }

  @ApiOperation({ summary: 'Update department' })
  @ApiResponse({ 
    status: 200, 
    description: 'Department updated successfully',
    type: DepartmentResponseDto
  })
  @ApiResponse({ status: 404, description: 'Department not found' })
  @UseGuards(AdminGuard)
  @Patch('departments/:id')
  updateDepartment(
    @Param('id') id: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
  ): Promise<DepartmentResponseDto> {
    return this.ticketsService.updateDepartment(id, updateDepartmentDto);
  }

  @ApiOperation({ summary: 'Create a new ticket' })
  @ApiResponse({ 
    status: 201, 
    description: 'Ticket created successfully',
    type: TicketResponseDto
  })
  @Post()
  async create(
    @Body() createTicketDto: CreateTicketDto, 
    @Request() req
  ): Promise<TicketResponseDto> {
    const data = await this.ticketsService.create(createTicketDto, req.user);
    return data;
  }

  @ApiOperation({ summary: 'Get all tickets' })
  @ApiResponse({ 
    status: 200, 
    description: 'Return paginated tickets',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
              title: { type: 'string', example: 'Cannot access my account' },
              status: { type: 'string', enum: ['open', 'in_progress', 'waiting_for_user', 'resolved', 'closed'], example: 'open' },
              priority: { type: 'string', enum: ['low', 'medium', 'high'], example: 'high' },
              department: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
                  name: { type: 'string', example: 'Support' },
                  description: { type: 'string', example: 'Support Department', nullable: true },
                  isActive: { type: 'boolean', example: true },
                  createdAt: { type: 'string', format: 'date-time', example: '2024-04-22T12:00:00Z' },
                  updatedAt: { type: 'string', format: 'date-time', example: '2024-04-22T12:00:00Z' }
                }
              },
              createdBy: { type: 'string', enum: ['system', 'user'], example: 'user' },
              messages: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
                    content: { type: 'string', example: 'Hello, how can I help you?' },
                    createdAt: { type: 'string', format: 'date-time', example: '2024-04-22T12:00:00Z' },
                    createdBy: { type: 'string', enum: ['system', 'user'], example: 'user' }
                  }
                }
              },
              createdAt: { type: 'string', format: 'date-time', example: '2024-04-22T12:00:00Z' },
              updatedAt: { type: 'string', format: 'date-time', example: '2024-04-22T12:00:00Z' },
              resolvedAt: { type: 'string', format: 'date-time', example: '2024-04-22T13:00:00Z', nullable: true },
              trackingId: { type: 'number', example: 52231 }
            }
          }
        },
        total: { type: 'number', example: 100 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 10 }
      }
    }
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: TicketStatus })
  @ApiQuery({ name: 'departmentIds', required: false, type: [String], description: 'List of department IDs' })
  @ApiQuery({ name: 'title', required: false, type: String, description: 'Search in ticket titles' })
  @Get()
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: TicketStatus,
    @Query('departmentIds') departmentIds?: string[] | string,
    @Query('title') title?: string,
  ): Promise<PaginatedResponseDto<TicketResponseDto>> {
    // Ensure departmentIds is always an array if provided
    let departmentIdsArray: string[] | undefined = undefined;
    if (typeof departmentIds === 'string') {
      departmentIdsArray = departmentIds.split(',');
    } else if (Array.isArray(departmentIds)) {
      departmentIdsArray = departmentIds;
    }
    const { tickets, total } = await this.ticketsService.findAll(page, limit, status, departmentIdsArray, title);
    return {
      data: tickets,
      page,
      limit,
      total
    };
  }

  @ApiOperation({ summary: 'Get ticket by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Return ticket details',
    type: TicketResponseDto
  })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<TicketResponseDto> {
    const data = await this.ticketsService.findOne(id);
    return data;
  }

  @ApiOperation({ summary: 'Update ticket' })
  @ApiResponse({ 
    status: 200, 
    description: 'Ticket updated successfully',
    type: Ticket
  })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @Patch(':id')
  update(
    @Param('id') id: string, 
    @Body() updateTicketDto: UpdateTicketDto
  ): Promise<Ticket> {
    return this.ticketsService.update(id, updateTicketDto);
  }

  @ApiOperation({ summary: 'Add message to ticket' })
  @ApiResponse({ 
    status: 201, 
    description: 'Message added successfully',
    type: TicketMessageResponseDto
  })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @Post(':id/messages')
  async addMessage(
    @Param('id') id: string,
    @Body() createMessageDto: CreateTicketMessageDto,
    @Request() req,
  ): Promise<TicketMessageResponseDto> {
    await this.ticketsService.addMessage(id, createMessageDto, req.user);
    return 
  }

  @ApiOperation({ summary: 'Get ticket messages' })
  @ApiResponse({ 
    status: 200, 
    description: 'Return ticket messages',
    type: [TicketMessageResponseDto]
  })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @Get(':id/messages')
  getMessages(@Param('id') id: string): Promise<TicketMessageResponseDto[]> {
    return this.ticketsService.getMessages(id);
  }

  @ApiOperation({ summary: 'Search tickets' })
  @ApiResponse({ 
    status: 200, 
    description: 'Return paginated tickets',
    type: PaginatedResponseDto<TicketResponseDto>
  })
  @ApiQuery({ name: 'query', required: false, type: String })
  @Get('search')
  search(@Query('query') query?: string): Promise<PaginatedResponseDto<TicketResponseDto>> {
    return this.ticketsService.search(query);
  }

  @ApiOperation({ summary: 'Close ticket' })
  @ApiResponse({ 
    status: 200, 
    description: 'Ticket closed successfully',
    type: TicketResponseDto
  })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @ApiResponse({ status: 400, description: 'Ticket is already closed' })
  @Post(':id/close')
  async closeTicket(@Param('id') id: string): Promise<TicketResponseDto> {
    const ticket = await this.ticketsService.closeTicket(id);
    return this.ticketsService.mapTicketToResponseDto(ticket, ticket.department);
  }
}