import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { CreateTicketMessageDto } from './dto/create-ticket-message.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { TicketMessageResponseDto, UserSystemEnum } from './dto/ticket-message-response.dto';
import { TicketResponseDto } from './dto/ticket-response.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { Department } from './entities/department.entity';
import { TicketMessage } from './entities/ticket-message.entity';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { PaginatedResponseDto } from '@/common/dto/paginated-response.dto';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
    @InjectRepository(TicketMessage)
    private ticketMessagesRepository: Repository<TicketMessage>,
    @InjectRepository(Department)
    private departmentsRepository: Repository<Department>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  // Department methods
  async createDepartment(createDepartmentDto: CreateDepartmentDto): Promise<Department> {
    const existingDepartment = await this.departmentsRepository.findOne({
      where: { name: createDepartmentDto.name },
    });

    if (existingDepartment) {
      throw new BadRequestException('Department with this name already exists');
    } 

    const department = this.departmentsRepository.create(createDepartmentDto);
    return this.departmentsRepository.save(department);
  }

  async findAllDepartments(): Promise<Department[]> {
    return this.departmentsRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findDepartment(id: string): Promise<Department> {
    const department = await this.departmentsRepository.findOne({
      where: { id },
      relations: ['tickets'],
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return department;
  }

  async updateDepartment(id: string, updateDepartmentDto: UpdateDepartmentDto): Promise<Department> {
    const department = await this.findDepartment(id);
    Object.assign(department, updateDepartmentDto);
    return this.departmentsRepository.save(department);
  }

  // Ticket methods
  mapTicketToResponseDto(ticket: Ticket, department: Department, firstMessage?: TicketMessage): TicketResponseDto {
    const response = new TicketResponseDto();
    response.id = ticket.id;
    response.title = ticket.title;
    response.status = ticket.status;
    response.priority = ticket.priority;
    response.department = {
      id: department.id,
      name: department.name,
      description: department.description,
      isActive: department.isActive,
      createdAt: department.createdAt,
      updatedAt: department.updatedAt
    };
    response.createdBy = UserSystemEnum.USER;
    response.messages = firstMessage ? [{
      id: firstMessage.id,
      content: firstMessage.content,
      createdAt: firstMessage.createdAt,
      createdBy: UserSystemEnum.USER
    }] : [];
    response.createdAt = ticket.createdAt;
    response.updatedAt = ticket.updatedAt;
    response.resolvedAt = ticket.resolvedAt;
    response.trackingId = ticket.trackingId;
    return response;
  }

  async create(createTicketDto: CreateTicketDto, user: User): Promise<TicketResponseDto> {
    const department = await this.departmentsRepository.findOne({
      where: { id: createTicketDto.departmentId },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    // Create and save the ticket entity
    const ticketEntity = this.ticketsRepository.create({
      ...createTicketDto,
      status: TicketStatus.IN_PROGRESS,
      department,
      createdBy: user,
    });
    const savedTicket = await this.ticketsRepository.save(ticketEntity);

    // Create and save the first message entity
    const messageEntity = this.ticketMessagesRepository.create({
      ticket: savedTicket,
      createdBy: user,
      content: createTicketDto.message,
    });
    const savedMessage = await this.ticketMessagesRepository.save(messageEntity);

    // Transform to response DTO
    return this.mapTicketToResponseDto(savedTicket, department, savedMessage);
  }

  async findAll(
    page = 1,
    limit = 10,
    status?: TicketStatus,
    departmentIds?: string[],
    title?: string,
  ): Promise<{ tickets: TicketResponseDto[]; total: number }> {
    const query = this.ticketsRepository.createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.createdBy', 'createdBy')
      .leftJoinAndSelect('ticket.department', 'department')
      .orderBy('ticket.createdAt', 'DESC');

    if (status) {
      query.andWhere('ticket.status = :status', { status });
    }

    if (departmentIds && departmentIds.length > 0) {
      query.andWhere('ticket.departmentId IN (:...departmentIds)', { departmentIds });
    }

    if (title) {
      query.andWhere('ticket.title LIKE :title', { title: `%${title}%` });
    }

    const [tickets, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { tickets: tickets.map(ticket => this.mapTicketToResponseDto(ticket, ticket.department)), total };
  }

  async findOne(id: string): Promise<TicketResponseDto> {
    const ticket = await this.ticketsRepository.findOne({
      where: { id },
      relations: ['createdBy', 'department'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return this.mapTicketToResponseDto(ticket, ticket.department);
  }

  async update(id: string, updateTicketDto: UpdateTicketDto): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findOne({
      where: { id },
      relations: ['department', 'createdBy']
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (updateTicketDto.departmentId) {
      const department = await this.departmentsRepository.findOne({
        where: { id: updateTicketDto.departmentId },
      });
      if (!department) {
        throw new NotFoundException('Department not found');
      }
      ticket.department = department;
    }

    if (updateTicketDto.status === TicketStatus.RESOLVED) {
      ticket.resolvedAt = new Date();
    }

    Object.assign(ticket, updateTicketDto);
    return this.ticketsRepository.save(ticket);
  }

  async search(query?: string, page = 1, limit = 10): Promise<PaginatedResponseDto<TicketResponseDto>> {
    const queryBuilder = this.ticketsRepository.createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.createdBy', 'createdBy')
      .leftJoinAndSelect('ticket.messages', 'messages')
      .leftJoinAndSelect('ticket.department', 'department')
      .orderBy('ticket.createdAt', 'DESC');
  
    if (query) {
      queryBuilder.andWhere('ticket.title LIKE :query', { query: `%${query}%` });
    }

    const [tickets, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: tickets.map(ticket => this.mapTicketToResponseDto(ticket, ticket.department)),
      total,
      page,
      limit
    };
  }


  async addMessage(
    ticketId: string,
    createMessageDto: CreateTicketMessageDto,
    user: User,
  ): Promise<TicketMessageResponseDto> {
    const ticket = await this.ticketsRepository.findOne({
      where: { id: ticketId },
      relations: ['createdBy', 'messages', 'messages.createdBy', 'department'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    
    const systemUser = user.role === UserRole.ADMIN ? 
      await this.usersRepository.findOne({ where: { id: 'system' } }) || 
      this.usersRepository.create({
        id: 'system',
        email: 'system@example.com',
        password: 'system',
        role: UserRole.ADMIN
      }) : user;

    // Create and save the message entity
    const messageEntity = this.ticketMessagesRepository.create({
      ...createMessageDto,
      ticket,
      createdBy: systemUser,
    });
    const savedMessage = await this.ticketMessagesRepository.save(messageEntity);
    
    // Transform to response DTO
    const response = new TicketMessageResponseDto();
    response.id = savedMessage.id;
    response.content = savedMessage.content;
    response.createdAt = savedMessage.createdAt;
    response.createdBy = systemUser.id === 'system' ? UserSystemEnum.SYSTEM : UserSystemEnum.USER;
    return response;
  }

  async getMessages(ticketId: string): Promise<TicketMessageResponseDto[]> {
    const messages = await this.ticketMessagesRepository.find({
      where: { ticket: { id: ticketId } },
      relations: ['createdBy'],
    });
    
    return messages.map(message => ({
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      createdBy: message.createdBy.id === 'system' ? UserSystemEnum.SYSTEM : UserSystemEnum.USER,
    }));
  }

  async closeTicket(id: string): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findOne({
      where: { id },
      relations: ['department', 'createdBy']
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    
    if (ticket.status === TicketStatus.CLOSED) {
      throw new BadRequestException('Ticket is already closed');
    }

    ticket.status = TicketStatus.CLOSED;
    return this.ticketsRepository.save(ticket);
  }
} 