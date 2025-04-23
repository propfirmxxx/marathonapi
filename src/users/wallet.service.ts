import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { CreateWalletDto } from './dto/wallet.dto';
import { UpdateWalletDto } from './dto/wallet.dto';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
  ) {}

  async create(userId: number, createWalletDto: CreateWalletDto): Promise<Wallet> {
    const wallet = this.walletRepository.create({
      ...createWalletDto,
      user: { id: userId },
    });

    return await this.walletRepository.save(wallet);
  }

  async findAll(userId: number): Promise<Wallet[]> {
    return await this.walletRepository.find({
      where: { user: { id: userId } },
    });
  }

  async findOne(userId: number, id: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findOne({
      where: { id, user: { id: userId } },
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet with ID ${id} not found`);
    }

    return wallet;
  }

  async update(userId: number, id: string, updateWalletDto: UpdateWalletDto): Promise<Wallet> {
    const wallet = await this.findOne(userId, id);

    if (updateWalletDto.isActive) {
      // Deactivate all other wallets
      await this.walletRepository
        .createQueryBuilder()
        .update(Wallet)
        .set({ isActive: false })
        .where('user_id = :userId AND id != :id', { userId, id })
        .execute();
    }

    Object.assign(wallet, updateWalletDto);
    return await this.walletRepository.save(wallet);
  }

  async remove(userId: number, id: string): Promise<void> {
    const wallet = await this.findOne(userId, id);

    if (wallet.isActive) {
      throw new BadRequestException('Cannot delete active wallet. Please set another wallet as active first.');
    }

    await this.walletRepository.remove(wallet);
  }

  async setActiveWallet(userId: number, id: string): Promise<Wallet> {
    const wallet = await this.findOne(userId, id);

    // Deactivate all other wallets
    await this.walletRepository
      .createQueryBuilder()
      .update(Wallet)
      .set({ isActive: false })
      .where('user_id = :userId AND id != :id', { userId, id })
      .execute();

    // Activate the selected wallet
    wallet.isActive = true;
    return await this.walletRepository.save(wallet);
  }

  async getActiveWallet(userId: number): Promise<Wallet | null> {
    return await this.walletRepository.findOne({
      where: { user: { id: userId }, isActive: true },
    });
  }
} 