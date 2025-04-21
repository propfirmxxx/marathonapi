import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarathonService } from './marathon.service';
import { MarathonController } from './marathon.controller';
import { Marathon } from './entities/marathon.entity';
import { MarathonParticipant } from './entities/marathon-participant.entity';
import { Account } from '../metaapi/entities/account.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Marathon, MarathonParticipant, Account])],
  controllers: [MarathonController],
  providers: [MarathonService],
  exports: [MarathonService],
})
export class MarathonModule {} 