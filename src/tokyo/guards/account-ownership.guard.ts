import { Injectable, CanActivate, ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MetaTraderAccount } from '../../metatrader-accounts/entities/meta-trader-account.entity';

@Injectable()
export class AccountOwnershipGuard implements CanActivate {
  constructor(
    @InjectRepository(MetaTraderAccount)
    private readonly metaTraderAccountRepository: Repository<MetaTraderAccount>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const login = request.params.login;

    if (!user || !user.id) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!login) {
      throw new ForbiddenException('Login parameter is required');
    }

    // Find account by login
    const account = await this.metaTraderAccountRepository.findOne({
      where: { login },
      select: ['id', 'userId', 'login'],
    });

    if (!account) {
      throw new NotFoundException(`Account with login ${login} not found`);
    }

    // Check if account belongs to user
    if (account.userId !== user.id) {
      throw new ForbiddenException(`You do not have access to account ${login}`);
    }

    return true;
  }
}

