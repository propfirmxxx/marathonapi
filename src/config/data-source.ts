import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '', 10) || 5432,
  username: process.env.DB_USERNAME || '',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || '',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  // migrationsRun is set to false because we call runMigrations() explicitly in main.ts
  migrationsRun: false,
  synchronize: process.env.NODE_ENV !== 'production', // Never use synchronize in production
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false,
});
