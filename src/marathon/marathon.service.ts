import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Marathon } from './entities/marathon.entity';
import { MarathonParticipant } from './entities/marathon-participant.entity';
import { CreateMarathonDto } from './dto/create-marathon.dto';
import { UpdateMarathonDto } from './dto/update-marathon.dto';

@Injectable()
export class MarathonService {
  constructor(
    @InjectRepository(Marathon)
    private readonly marathonRepository: Repository<Marathon>,
    @InjectRepository(MarathonParticipant)
    private readonly participantRepository: Repository<MarathonParticipant>,
  ) {}

  async create(createMarathonDto: CreateMarathonDto): Promise<Marathon> {
    const marathon = this.marathonRepository.create(createMarathonDto);
    return await this.marathonRepository.save(marathon);
  }

  async findAll(): Promise<Marathon[]> {
    return await this.marathonRepository.find({
      relations: ['participants'],
    });
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
    Object.assign(marathon, updateMarathonDto);
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

  async getMarathonParticipants(marathonId: string): Promise<MarathonParticipant[]> {
    return await this.participantRepository.find({
      where: { marathon: { id: marathonId } },
      relations: ['user'],
    });
  }
} 