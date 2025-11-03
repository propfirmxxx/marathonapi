import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Seeder } from './seeder.interface';
import { FaqSeeder } from './faq.seeder';
import { MarathonSeeder } from './marathon.seeder';
import { MetaTraderAccountSeeder } from './metatrader-account.seeder';

@Injectable()
export class SeederService {
  private readonly logger = new Logger(SeederService.name);
  private readonly seeders: Seeder[];

  constructor(private readonly dataSource: DataSource) {
    this.seeders = [
      new FaqSeeder(dataSource),
      new MarathonSeeder(dataSource),
      new MetaTraderAccountSeeder(dataSource),
    ];
  }

  /**
   * Run all seeders
   */
  async seed(): Promise<void> {
    if (process.env.SEED_MOCK_DATA !== 'true') {
      this.logger.log('Skipping seeders - SEED_MOCK_DATA not enabled');
      return;
    }

    this.logger.log('Starting database seeding...');

    try {
      for (const seeder of this.seeders) {
        this.logger.log(`Running ${seeder.getName()}...`);
        await seeder.run();
      }

      this.logger.log('✓ All seeders completed successfully');
    } catch (error) {
      this.logger.error('✗ Error during seeding', error);
      throw error;
    }
  }

  /**
   * Run a specific seeder by name
   */
  async seedSpecific(seederName: string): Promise<void> {
    if (process.env.SEED_MOCK_DATA !== 'true') {
      this.logger.log('Skipping seeders - SEED_MOCK_DATA not enabled');
      return;
    }

    const seeder = this.seeders.find((s) => s.getName() === seederName);

    if (!seeder) {
      this.logger.error(`Seeder '${seederName}' not found`);
      throw new Error(`Seeder '${seederName}' not found`);
    }

    this.logger.log(`Running ${seeder.getName()}...`);
    await seeder.run();
    this.logger.log(`✓ ${seeder.getName()} completed`);
  }

  /**
   * Clean all seeded data
   */
  async clean(): Promise<void> {
    this.logger.log('Cleaning seeded data...');

    try {
      // Run cleanup in reverse order
      for (let i = this.seeders.length - 1; i >= 0; i--) {
        this.logger.log(`Cleaning ${this.seeders[i].getName()}...`);
        await this.seeders[i].clean();
      }

      this.logger.log('✓ All seeders cleaned successfully');
    } catch (error) {
      this.logger.error('✗ Error during cleanup', error);
      throw error;
    }
  }

  /**
   * Clean a specific seeder by name
   */
  async cleanSpecific(seederName: string): Promise<void> {
    const seeder = this.seeders.find((s) => s.getName() === seederName);

    if (!seeder) {
      this.logger.error(`Seeder '${seederName}' not found`);
      throw new Error(`Seeder '${seederName}' not found`);
    }

    this.logger.log(`Cleaning ${seeder.getName()}...`);
    await seeder.clean();
    this.logger.log(`✓ ${seeder.getName()} cleaned`);
  }

  /**
   * Get list of available seeders
   */
  getSeederNames(): string[] {
    return this.seeders.map((s) => s.getName());
  }
}
