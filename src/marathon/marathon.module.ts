import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarathonService } from './marathon.service';
import { MarathonController } from './marathon.controller';
import { Marathon } from './entities/marathon.entity';
import { MarathonParticipant } from './entities/marathon-participant.entity';
import { Account } from '../metaapi/entities/account.entity';
import { UsersModule } from '../users/users.module';
import { PaymentModule } from '../payment/payment.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Marathon, MarathonParticipant, Account]),
    UsersModule,
    PaymentModule,
    AuthModule,
  ],
  controllers: [MarathonController],
  providers: [MarathonService],
  exports: [MarathonService],
})
export class MarathonModule {} 