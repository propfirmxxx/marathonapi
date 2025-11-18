import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SessionService } from './session.service';
import { LoginHistoryService } from './login-history.service';
import { UserSettings } from './entities/user-settings.entity';
import { Session } from './entities/session.entity';
import { LoginHistory } from './entities/login-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserSettings, Session, LoginHistory]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
    ConfigModule,
  ],
  controllers: [SettingsController],
  providers: [SettingsService, SessionService, LoginHistoryService],
  exports: [SettingsService, SessionService, LoginHistoryService],
})
export class SettingsModule {}

