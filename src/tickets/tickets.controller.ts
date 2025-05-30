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
import { TicketStatus } from './entities/ticket.entity';
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

  @ApiOperation({ summary: 'Get all departments' })
  @ApiResponse({ 
    status: 200, 
    description: 'Return all active departments',
    type: [DepartmentResponseDto]
  })
  @Get('departments')
  findAllDepartments(): Promise<DepartmentResponseDto[]> {
    return this.ticketsService.findAllDepartments();
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
    type: PaginatedResponseDto<TicketResponseDto>
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: TicketStatus })
  @ApiQuery({ name: 'departmentId', required: false, type: String })
  @Get()
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: TicketStatus,
    @Query('departmentId') departmentId?: string,
  ): Promise<PaginatedResponseDto<TicketResponseDto>> {
    const { tickets, total } = await this.ticketsService.findAll(page, limit, status, departmentId);
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
    type: TicketResponseDto
  })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @Patch(':id')
  update(
    @Param('id') id: string, 
    @Body() updateTicketDto: UpdateTicketDto
  ): Promise<TicketResponseDto> {
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
  addMessage(
    @Param('id') id: string,
    @Body() createMessageDto: CreateTicketMessageDto,
    @Request() req,
  ): Promise<TicketMessageResponseDto> {
    return this.ticketsService.addMessage(id, createMessageDto, req.user);
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
    const data = await this.ticketsService.closeTicket(id);
    return data;
  }
}