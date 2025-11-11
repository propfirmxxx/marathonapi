import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { CreateWalletDto, UpdateWalletDto } from './dto/wallet.dto';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
  ) {}

  async create(userId: string, createWalletDto: CreateWalletDto): Promise<Wallet> {
    const existingWalletWithName = await this.walletRepository.findOne({
      where: {
        name: createWalletDto.name,
        user: { id: userId },
      },
    });

    if (existingWalletWithName) {
      throw new BadRequestException('A wallet with this name already exists');
    }

    const existingWalletWithAddress = await this.walletRepository.findOne({
      where: {
        address: createWalletDto.address,
        user: { id: userId },
      },
    });

    if (existingWalletWithAddress) {
      throw new BadRequestException('A wallet with this address already exists');
    }

    const wallet = this.walletRepository.create({
      ...createWalletDto,
      user: { id: userId },
    });

    return this.walletRepository.save(wallet);
  }

  async findAll(userId: string): Promise<Wallet[]> {
    return this.walletRepository.find({
      where: { user: { id: userId } },
    });
  }

  async findOne(userId: string, id: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findOne({
      where: { id, user: { id: userId } },
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet with ID ${id} not found`);
    }

    return wallet;
  }

  async update(userId: string, id: string, updateWalletDto: UpdateWalletDto): Promise<Wallet> {
    const wallet = await this.findOne(userId, id);

    Object.assign(wallet, updateWalletDto);
    return this.walletRepository.save(wallet);
  }

  async remove(userId: string, id: string): Promise<{ message: string }> {
    const wallet = await this.findOne(userId, id);

    if (wallet.isActive) {
      throw new BadRequestException('Cannot delete active wallet. Please set another wallet as active first.');
    }

    await this.walletRepository.remove(wallet);

    return {
      message: 'Wallet deleted successfully',
    };
  }

  async activateWallet(userId: string, id: string): Promise<Wallet> {
    const wallet = await this.findOne(userId, id);

    wallet.isActive = true;
    return this.walletRepository.save(wallet);
  }

  async deactivateWallet(userId: string, id: string): Promise<Wallet> {
    const wallet = await this.findOne(userId, id);

    wallet.isActive = false;
    return this.walletRepository.save(wallet);
  }

  async getActiveWallets(userId: string): Promise<Wallet[]> {
    return this.walletRepository.find({
      where: { user: { id: userId }, isActive: true },
    });
  }
}

