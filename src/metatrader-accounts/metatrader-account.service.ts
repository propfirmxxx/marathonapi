import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MetaTraderAccount, MetaTraderAccountStatus } from './entities/meta-trader-account.entity';
import { CreateMetaTraderAccountDto } from './dto/create-metatrader-account.dto';
import { AssignAccountDto } from './dto/assign-account.dto';
import { MarathonParticipant } from '../marathon/entities/marathon-participant.entity';

@Injectable()
export class MetaTraderAccountService {
  constructor(
    @InjectRepository(MetaTraderAccount)
    private readonly metaTraderAccountRepository: Repository<MetaTraderAccount>,
    @InjectRepository(MarathonParticipant)
    private readonly participantRepository: Repository<MarathonParticipant>,
  ) {}

  async create(createDto: CreateMetaTraderAccountDto): Promise<MetaTraderAccount> {
    // Validate that at least one password is provided
    if (!createDto.masterPassword && !createDto.investorPassword) {
      throw new BadRequestException('Either masterPassword or investorPassword must be provided');
    }

    const account = this.metaTraderAccountRepository.create({
      name: createDto.name,
      login: createDto.login,
      masterPassword: createDto.masterPassword,
      investorPassword: createDto.investorPassword,
      server: createDto.server,
      platform: createDto.platform || 'mt5',
      status: createDto.status || MetaTraderAccountStatus.UNDEPLOYED,
    });

    return await this.metaTraderAccountRepository.save(account);
  }

  async findById(id: string): Promise<MetaTraderAccount> {
    const account = await this.metaTraderAccountRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!account) {
      throw new NotFoundException(`MetaTrader account with ID ${id} not found`);
    }

    return account;
  }

  async findAvailable(): Promise<MetaTraderAccount[]> {
    return await this.metaTraderAccountRepository.find({
      where: { marathonParticipantId: null },
      relations: ['user'],
    });
  }

  async findByParticipantId(participantId: string): Promise<MetaTraderAccount | null> {
    return await this.metaTraderAccountRepository.findOne({
      where: { marathonParticipantId: participantId },
      relations: ['user'],
    });
  }

  async assignToParticipant(accountId: string, assignDto: AssignAccountDto): Promise<MetaTraderAccount> {
    // Check if account exists
    const account = await this.findById(accountId);

    // Check if account is already assigned
    if (account.marathonParticipantId) {
      throw new ConflictException('This account is already assigned to a marathon participant');
    }

    // Check if participant exists
    const participant = await this.participantRepository.findOne({
      where: { id: assignDto.marathonParticipantId },
      relations: ['user', 'marathon'],
    });

    if (!participant) {
      throw new NotFoundException(`Marathon participant with ID ${assignDto.marathonParticipantId} not found`);
    }

    // Check if participant already has an account assigned
    const existingAccount = await this.findByParticipantId(assignDto.marathonParticipantId);
    if (existingAccount) {
      throw new ConflictException('This participant already has a MetaTrader account assigned');
    }

    // Assign the account
    account.marathonParticipantId = assignDto.marathonParticipantId;
    account.userId = participant.user?.id || null;

    return await this.metaTraderAccountRepository.save(account);
  }

  async unassignFromParticipant(accountId: string): Promise<MetaTraderAccount> {
    const account = await this.findById(accountId);

    if (!account.marathonParticipantId) {
      throw new BadRequestException('This account is not assigned to any participant');
    }

    account.marathonParticipantId = null;
    account.userId = null;

    return await this.metaTraderAccountRepository.save(account);
  }

  async findAll(): Promise<MetaTraderAccount[]> {
    return await this.metaTraderAccountRepository.find({
      relations: ['user'],
    });
  }

  async remove(id: string): Promise<void> {
    const account = await this.findById(id);

    if (account.marathonParticipantId) {
      throw new BadRequestException('Cannot delete account that is assigned to a participant. Unassign it first.');
    }

    await this.metaTraderAccountRepository.remove(account);
  }
}

