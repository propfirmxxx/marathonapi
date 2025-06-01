import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { CreateWalletDto } from './dto/wallet.dto';
import { UpdateWalletDto } from './dto/wallet.dto';
import { classToPlain, instanceToPlain } from 'class-transformer';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
  ) {}

  async create(userId: string, createWalletDto: CreateWalletDto): Promise<Wallet> {
    // Check for existing wallet with same name
    const existingWalletWithName = await this.walletRepository.findOne({
      where: { 
        name: createWalletDto.name,
        user: { uid: userId }
      }
    });

    if (existingWalletWithName) {
      throw new BadRequestException('A wallet with this name already exists');
    }

    // Check for existing wallet with same address
    const existingWalletWithAddress = await this.walletRepository.findOne({
      where: { 
        address: createWalletDto.address,
        user: { uid: userId }
      }
    });

    if (existingWalletWithAddress) {
      throw new BadRequestException('A wallet with this address already exists');
    }

    const wallet = this.walletRepository.create({
      ...createWalletDto,
      user: { uid: userId },
    });

    return await this.walletRepository.save(wallet);
  }

  async findAll(userId: string): Promise<Wallet[]> {
    const wallets = await this.walletRepository.find({
      where: { user: { uid: userId } },
    });

    return wallets;
  }

  async findOne(userId: string, id: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findOne({
      where: { id, user: { uid: userId } },
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet with ID ${id} not found`);
    }

    return wallet;
  }

  async update(userId: string, id: string, updateWalletDto: UpdateWalletDto): Promise<Wallet> {
    const wallet = await this.findOne(userId, id);

    if (!wallet) {
      throw new NotFoundException(`Wallet with ID ${id} not found`);
    }

    Object.assign(wallet, updateWalletDto);
    return await this.walletRepository.save(wallet);
  }

  async remove(userId: string, id: string): Promise<void> {
    const wallet = await this.findOne(userId, id);

    if (wallet.isActive) {
      throw new BadRequestException('Cannot delete active wallet. Please set another wallet as active first.');
    }

    await this.walletRepository.remove(wallet);
  }

  async activateWallet(userId: string, id: string): Promise<Wallet> {
    const wallet = await this.findOne(userId, id);

    if (!wallet) {
      throw new NotFoundException(`Wallet with ID ${id} not found`);
    }

    wallet.isActive = true;
    return await this.walletRepository.save(wallet);
  }

  async deactivateWallet(userId: string, id: string): Promise<Wallet> {
    const wallet = await this.findOne(userId, id);

    if (!wallet) {
      throw new NotFoundException(`Wallet with ID ${id} not found`);
    }

    wallet.isActive = false;
    return await this.walletRepository.save(wallet);
  }

  async getActiveWallets(userId: string): Promise<Wallet[]> {
    return await this.walletRepository.find({
      where: { user: { uid: userId }, isActive: true },
    });
  }
} 