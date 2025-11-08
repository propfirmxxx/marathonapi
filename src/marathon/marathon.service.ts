import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Marathon } from './entities/marathon.entity';
import { MarathonParticipant } from './entities/marathon-participant.entity';
import { CreateMarathonDto } from './dto/create-marathon.dto';
import { UpdateMarathonDto } from './dto/update-marathon.dto';
import { PrizeDistributionService } from './prize-distribution.service';
import { PrizePayout, PrizeResult, PrizeStrategyConfig, PrizeStrategyType } from './entities/prize-strategy.types';
import { MetaTraderAccount, MetaTraderAccountStatus } from '../metatrader-accounts/entities/meta-trader-account.entity';
import { TokyoService } from '../tokyo/tokyo.service';

@Injectable()
export class MarathonService {
  private readonly logger = new Logger(MarathonService.name);

  constructor(
    @InjectRepository(Marathon)
    private readonly marathonRepository: Repository<Marathon>,
    @InjectRepository(MarathonParticipant)
    private readonly participantRepository: Repository<MarathonParticipant>,
    @InjectRepository(MetaTraderAccount)
    private readonly metaTraderAccountRepository: Repository<MetaTraderAccount>,
    private readonly prizeDistributionService: PrizeDistributionService,
    private readonly tokyoService: TokyoService,
  ) {}

  async create(createMarathonDto: CreateMarathonDto): Promise<Marathon> {
    const { prizeStrategyType, prizeStrategyConfig, ...rest } = createMarathonDto;

    const marathon = this.marathonRepository.create({
      ...rest,
      prizeStrategyType: prizeStrategyType ?? PrizeStrategyType.WINNER_TAKE_ALL,
      prizeStrategyConfig: prizeStrategyConfig ?? this.getDefaultConfig(prizeStrategyType),
    });
    return await this.marathonRepository.save(marathon);
  }

  async findAll(): Promise<Marathon[]> {
    return await this.marathonRepository.find();
  }

  async findAllWithFilters(
    page: number = 1,
    limit: number = 10,
    isActive?: boolean,
    userId?: string,
    search?: string,
  ): Promise<{ marathons: Marathon[]; total: number }> {
    let query = this.marathonRepository.createQueryBuilder('marathon');

    if (userId) {
      query = query
        .innerJoin('marathon.participants', 'filterParticipant', 'filterParticipant.user_id = :userId', { userId });
    }

    query = query.orderBy('marathon.createdAt', 'DESC');

    if (isActive !== undefined) {
      query = query.andWhere('marathon.isActive = :isActive', { isActive });
    }

    if (search) {
      query = query.andWhere('LOWER(marathon.name) LIKE LOWER(:search)', { search: `%${search}%` });
    }

    // Get total count before pagination
    const total = await query.getCount();

    // Apply pagination
    const marathons = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { marathons, total };
  }

  async findOne(id: string): Promise<Marathon> {
    const marathon = await this.marathonRepository.findOne({
      where: { id },
      relations: ['participants'],
    });

    if (!marathon) {
      throw new NotFoundException(`Marathon with ID ${id} not found`);
    }

    return marathon;
  }

  async update(id: string, updateMarathonDto: UpdateMarathonDto): Promise<Marathon> {
    const marathon = await this.findOne(id);
    const { prizeStrategyType, prizeStrategyConfig, ...rest } = updateMarathonDto;

    Object.assign(marathon, rest);

    if (prizeStrategyType !== undefined) {
      marathon.prizeStrategyType = prizeStrategyType;
      if (prizeStrategyConfig === undefined) {
        marathon.prizeStrategyConfig = this.getDefaultConfig(prizeStrategyType);
      }
    }

    if (prizeStrategyConfig !== undefined) {
      marathon.prizeStrategyConfig = prizeStrategyConfig ?? this.getDefaultConfig(prizeStrategyType ?? marathon.prizeStrategyType);
    }

    return await this.marathonRepository.save(marathon);
  }

  async remove(id: string): Promise<void> {
    const result = await this.marathonRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Marathon with ID ${id} not found`);
    }
  }

  async joinMarathon(userId: string, marathonId: string): Promise<MarathonParticipant> {
    // Check if user is already a participant
    const existingParticipant = await this.participantRepository.findOne({
      where: {
        marathon: { id: marathonId },
        user: { id: userId },
      },
    });

    if (existingParticipant) {
      throw new ConflictException('User is already a participant in this marathon');
    }

    // Create new participant
    const participant = this.participantRepository.create({
      marathon: { id: marathonId },
      user: { id: userId },
      isActive: true,
    });

    return await this.participantRepository.save(participant);
  }

  async getMarathonParticipants(
    marathonId: string,
  ): Promise<{ participants: MarathonParticipant[]; total: number; marathon: Marathon }> {
    // Check if marathon exists
    const marathon = await this.marathonRepository.findOne({
      where: { id: marathonId },
    });

    if (!marathon) {
      throw new NotFoundException(`Marathon with ID ${marathonId} not found`);
    }

    const participants = await this.participantRepository.find({
      where: { marathon: { id: marathonId } },
      relations: ['marathon', 'user', 'user.profile', 'metaTraderAccount'],
      order: { createdAt: 'DESC' },
    });

    if (this.hasMarathonStarted(marathon)) {
      await this.deployParticipantAccounts(participants);
    }

    return {
      participants,
      total: participants.length,
      marathon,
    };
  }

  async calculatePrizeDistribution(marathonId: string, results: PrizeResult[]): Promise<PrizePayout[]> {
    const marathon = await this.findOne(marathonId);
    return this.prizeDistributionService.calculate(marathon, results);
  }

  private hasMarathonStarted(marathon: Marathon): boolean {
    if (!marathon?.startDate) {
      return false;
    }

    return marathon.startDate.getTime() <= Date.now();
  }

  private async deployParticipantAccounts(participants: MarathonParticipant[]): Promise<void> {
    for (const participant of participants) {
      const account = participant.metaTraderAccount;
      if (!account?.login) {
        continue;
      }

      if (account.status === MetaTraderAccountStatus.DEPLOYED) {
        continue;
      }

      try {
        await this.tokyoService.deployAccount(account.login);
        account.status = MetaTraderAccountStatus.DEPLOYED;
        await this.metaTraderAccountRepository.save(account);
      } catch (error) {
        this.logger.warn(
          `Failed to deploy MetaTrader account ${account.login} for participant ${participant.id}: ${error.message}`,
        );
      }
    }
  }

  private getDefaultConfig(type?: PrizeStrategyType): PrizeStrategyConfig | null {
    switch (type ?? PrizeStrategyType.WINNER_TAKE_ALL) {
      case PrizeStrategyType.WINNER_TAKE_ALL:
        return {
          placements: [
            {
              position: 1,
              percentage: 100,
            },
          ],
        };
      default:
        return null;
    }
  }
} 