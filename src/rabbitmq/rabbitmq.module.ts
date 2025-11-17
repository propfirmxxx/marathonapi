/**
 * RabbitMQ Module
 * Provides RabbitMQ functionality to NestJS applications
 */

import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RabbitMQConnectionService } from './services/rabbitmq-connection.service';
import { RabbitMQConsumerService } from './services/rabbitmq-consumer.service';
import { RabbitMQHealthService } from './services/rabbitmq-health.service';
import { RabbitMQConfig, defaultRabbitMQConfig, RABBITMQ_CONFIG } from './config/rabbitmq.config';
import {
  RabbitMQModuleOptions,
  RabbitMQModuleAsyncOptions,
  RabbitMQOptionsFactory,
} from './interfaces/rabbitmq-options.interface';

@Global()
@Module({})
export class RabbitMQModule {
  /**
   * Register RabbitMQ module with options
   */
  static register(options: RabbitMQModuleOptions): DynamicModule {
    const configProvider: Provider = {
      provide: RABBITMQ_CONFIG,
      useValue: {
        ...defaultRabbitMQConfig,
        ...options,
      } as RabbitMQConfig,
    };

    return {
      module: RabbitMQModule,
      providers: [
        configProvider,
        RabbitMQConnectionService,
        RabbitMQConsumerService,
        RabbitMQHealthService,
      ],
      exports: [
        RABBITMQ_CONFIG,
        RabbitMQConnectionService,
        RabbitMQConsumerService,
        RabbitMQHealthService,
      ],
    };
  }

  /**
   * Register RabbitMQ module asynchronously
   */
  static registerAsync(options: RabbitMQModuleAsyncOptions): DynamicModule {
    const providers: Provider[] = [
      ...this.createAsyncProviders(options),
      RabbitMQConnectionService,
      RabbitMQConsumerService,
      RabbitMQHealthService,
    ];

    return {
      module: RabbitMQModule,
      imports: options.imports || [],
      providers,
      exports: [
        RABBITMQ_CONFIG,
        RabbitMQConnectionService,
        RabbitMQConsumerService,
        RabbitMQHealthService,
      ],
    };
  }

  /**
   * Register with ConfigService
   */
  static forRoot(): DynamicModule {
    return this.registerAsync({
      useFactory: (configService: ConfigService) => ({
        url: configService.get<string>('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672/'),
        enabled: configService.get<string>('RABBITMQ_ENABLED', 'true').toLowerCase() === 'true',
        exchangeName: configService.get<string>(
          'RABBITMQ_EXCHANGE',
          defaultRabbitMQConfig.exchangeName,
        ),
        prefetchCount: parseInt(
          configService.get<string>('RABBITMQ_PREFETCH', '10'),
          10,
        ),
      }),
      inject: [ConfigService],
    });
  }

  /**
   * Export RABBITMQ_CONFIG token for manual injection
   */
  static get CONFIG_TOKEN() {
    return RABBITMQ_CONFIG;
  }

  private static createAsyncProviders(options: RabbitMQModuleAsyncOptions): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }

    if (options.useClass) {
      return [
        this.createAsyncOptionsProvider(options),
        {
          provide: options.useClass,
          useClass: options.useClass,
        },
      ];
    }

    return [];
  }

  private static createAsyncOptionsProvider(options: RabbitMQModuleAsyncOptions): Provider {
    if (options.useFactory) {
      return {
        provide: RABBITMQ_CONFIG,
        useFactory: async (...args: any[]) => {
          const config = await options.useFactory(...args);
          return {
            ...defaultRabbitMQConfig,
            ...config,
          } as RabbitMQConfig;
        },
        inject: options.inject || [],
      };
    }

    return {
      provide: RABBITMQ_CONFIG,
      useFactory: async (optionsFactory: RabbitMQOptionsFactory) => {
        const config = await optionsFactory.createRabbitMQOptions();
        return {
          ...defaultRabbitMQConfig,
          ...config,
        } as RabbitMQConfig;
      },
      inject: [options.useExisting || options.useClass],
    };
  }
}

