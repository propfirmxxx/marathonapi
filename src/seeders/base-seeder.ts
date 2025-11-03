import { DataSource, EntityManager } from 'typeorm';
import { Seeder } from './seeder.interface';
import { Logger } from '@nestjs/common';

export abstract class BaseSeeder implements Seeder {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(protected readonly dataSource: DataSource) {}

  /**
   * Abstract method to implement in subclasses
   */
  abstract run(): Promise<void>;

  /**
   * Abstract method to implement in subclasses
   */
  abstract clean(): Promise<void>;

  /**
   * Get the name of the seeder
   */
  abstract getName(): string;

  /**
   * Get entity manager for database operations
   */
  protected getManager(): EntityManager {
    return this.dataSource.manager;
  }

  /**
   * Check if table exists in database
   */
  protected async hasTable(tableName: string): Promise<boolean> {
    if (!this.dataSource.isInitialized) {
      throw new Error('DataSource is not initialized');
    }
    
    // Use dataSource.query instead of queryRunner for better connection management
    const result = await this.dataSource.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )`,
      [tableName]
    );
    return result[0].exists;
  }

  /**
   * Execute raw SQL query
   */
  protected async query(sql: string, parameters?: any[]): Promise<any> {
    if (!this.dataSource.isInitialized) {
      throw new Error('DataSource is not initialized');
    }
    
    // Use dataSource.query which automatically manages connections
    return await this.dataSource.query(sql, parameters);
  }
}
