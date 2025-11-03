import { DataSource } from 'typeorm';
import { AppDataSource } from '../config/data-source';
import { SeederService } from './seeder.service';

async function runSeeders() {
  const command = process.argv[2];
  const seederName = process.argv[3];

  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✓ Database connection initialized');
    }

    const seederService = new SeederService(AppDataSource);

    switch (command) {
      case 'seed':
        await seederService.seed();
        break;
      case 'seed:one':
        if (!seederName) {
          console.error('Error: Seeder name is required');
          console.log('Available seeders:', seederService.getSeederNames().join(', '));
          process.exit(1);
        }
        await seederService.seedSpecific(seederName);
        break;
      case 'clean':
        await seederService.clean();
        break;
      case 'clean:one':
        if (!seederName) {
          console.error('Error: Seeder name is required');
          console.log('Available seeders:', seederService.getSeederNames().join(', '));
          process.exit(1);
        }
        await seederService.cleanSpecific(seederName);
        break;
      default:
        console.log('Usage:');
        console.log('  npm run seed                  - Run all seeders');
        console.log('  npm run seed:one <name>       - Run a specific seeder');
        console.log('  npm run seed:clean            - Clean all seeded data');
        console.log('  npm run seed:clean:one <name> - Clean a specific seeder');
        console.log('');
        console.log('Available seeders:', seederService.getSeederNames().join(', '));
        process.exit(1);
    }

    console.log('✓ Seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('✗ Seeding failed:', error);
    process.exit(1);
  }
}

runSeeders();
