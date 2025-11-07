import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { config } from 'dotenv';

config();

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || '',
  port: parseInt(process.env.DB_PORT || '', 10) || 5432,
  username: process.env.DB_USERNAME || '',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || '',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  // migrationsRun is set to false because we call runMigrations() explicitly in main.ts
  migrationsRun: true,
  synchronize: false, // Never use synchronize - use migrations instead
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false,
}; 