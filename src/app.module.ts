import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { MarathonModule } from './marathon/marathon.module';
import { MetaTraderAccountModule } from './metatrader-accounts/metatrader-account.module';
import { PaymentModule } from './payment/payment.module';
import { ProfileModule } from './profile/profile.module';
import { databaseConfig } from './config/database.config';
import { NotificationModule } from './notifications/notification.module';
import { TicketsModule } from './tickets/tickets.module';
import { I18nModule } from './i18n/i18n.module';
import { I18nMiddleware } from './i18n/i18n.middleware';
import { FaqModule } from './faq/faq.module';
import { CronJobsModule } from './cron-jobs/cron-jobs.module';
import { VirtualWalletModule } from './virtual-wallet/virtual-wallet.module';
import { WithdrawalsModule } from './withdrawals/withdrawals.module';
import { WalletModule } from './wallet/wallet.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Only enable HTTP throttling outside of development to avoid 429s during local dev/startup.
    ...(process.env.NODE_ENV === 'development'
      ? []
      : [
          // Throttler v6 expects either an array of throttler configs or an
          // options object with a `throttlers` array. Provide the expected
          // shape to avoid `this.options.throttlers` being undefined.
          ThrottlerModule.forRoot({
            throttlers: [
              {
                ttl: 60,
                limit: 10,
              },
            ],
          } as any),
        ]),
    TypeOrmModule.forRoot(databaseConfig),
    UsersModule,
    AuthModule,
    EmailModule,
    MarathonModule,
    MetaTraderAccountModule,
    PaymentModule,
    ProfileModule,
    NotificationModule,
    TicketsModule,
    I18nModule,
    FaqModule,
    CronJobsModule,
    VirtualWalletModule,
    WalletModule,
    WithdrawalsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Register global throttler guard only in non-development environments
    ...(process.env.NODE_ENV === 'development'
      ? []
      : [
          {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
          },
        ]),
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(I18nMiddleware).forRoutes('*');
  }
}
