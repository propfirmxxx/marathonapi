import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { TicketMessage } from './entities/ticket-message.entity';
import { Department } from './entities/department.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { CreateTicketMessageDto } from './dto/create-ticket-message.dto';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { TicketResponseDto } from './dto/ticket-response.dto';

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
  async create(createTicketDto: CreateTicketDto, user: User): Promise<Ticket> {
    const department = await this.departmentsRepository.findOne({
      where: { id: createTicketDto.departmentId },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    const ticket = this.ticketsRepository.create({
      ...createTicketDto,
      status: TicketStatus.IN_PROGRESS,
      department,
      createdBy: user,
    });

    return this.ticketsRepository.save(ticket);
  }

  async findAll(
    page = 1,
    limit = 10,
    status?: TicketStatus,
    departmentId?: string,
  ): Promise<{ tickets: TicketResponseDto[]; total: number }> {
    const query = this.ticketsRepository.createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.createdBy', 'createdBy')
      .leftJoinAndSelect('ticket.messages', 'messages')
      .leftJoinAndSelect('ticket.department', 'department')
      .orderBy('ticket.createdAt', 'DESC');

    if (status) {
      query.andWhere('ticket.status = :status', { status });
    }

    if (departmentId) {
      query.andWhere('ticket.departmentId = :departmentId', { departmentId });
    }

    const [tickets, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { tickets, total };
  }

  async findOne(id: string): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findOne({
      where: { id },
      relations: ['createdBy', 'messages', 'messages.createdBy', 'department'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  async update(id: string, updateTicketDto: UpdateTicketDto): Promise<Ticket> {
    const ticket = await this.findOne(id);

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

  async addMessage(
    ticketId: string,
    createMessageDto: CreateTicketMessageDto,
    user: User,
  ): Promise<TicketMessage> {
    const ticket = await this.findOne(ticketId);
    
    const systemUser = user.role === UserRole.ADMIN ? 
      await this.usersRepository.findOne({ where: { uid: 'system' } }) || 
      this.usersRepository.create({
        uid: 'system',
        email: 'trading@marathon.com',
        role: UserRole.ADMIN
      }) : user;

    const message = this.ticketMessagesRepository.create({
      ...createMessageDto,
      ticket,
      createdBy: systemUser,
    });

    return this.ticketMessagesRepository.save(message);
  }

  async getMessages(ticketId: string): Promise<TicketMessage[]> {
    const ticket = await this.findOne(ticketId);
    return ticket.messages;
  }

  async closeTicket(id: string): Promise<Ticket> {
    const ticket = await this.findOne(id);
    
    if (ticket.status === TicketStatus.CLOSED) {
      throw new BadRequestException('Ticket is already closed');
    }

    ticket.status = TicketStatus.CLOSED;
    return this.ticketsRepository.save(ticket);
  }
} 