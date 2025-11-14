import { DataSource } from 'typeorm';
import { BaseSeeder } from './base-seeder';
import { User, UserRole } from '../users/entities/user.entity';
import { Profile } from '../profile/entities/profile.entity';

export class UserSeeder extends BaseSeeder {
  private readonly seededUserEmails = [
    'testuser1@example.com',
    'testuser2@example.com',
  ];

  getName(): string {
    return 'UserSeeder';
  }

  async run(): Promise<void> {
    const hasUsers = await this.hasTable('users');
    const hasProfile = await this.hasTable('profile');

    if (!hasUsers) {
      this.logger.warn('Users table does not exist. Skipping user seeding.');
      return;
    }

    this.logger.log('Seeding User data...');

    const manager = this.getManager();
    const userRepository = manager.getRepository(User);
    const profileRepository = manager.getRepository(Profile);

    // Check if users already exist
    const existingUsers = await userRepository.find({
      where: this.seededUserEmails.map(email => ({ email })),
    });

    if (existingUsers.length > 0) {
      this.logger.log(`Found ${existingUsers.length} existing user(s). Skipping creation.`);
      return;
    }

    // Create users
    const users = userRepository.create([
      {
        email: 'testuser1@example.com',
        password: 'Test123!@#',
        isActive: true,
        role: UserRole.USER,
      },
      {
        email: 'testuser2@example.com',
        password: 'Test123!@#',
        isActive: true,
        role: UserRole.USER,
      },
    ]);

    const savedUsers = await userRepository.save(users);

    // Create profiles for users
    if (hasProfile) {
      const profiles = profileRepository.create([
        {
          userId: savedUsers[0].id,
          firstName: 'Test',
          lastName: 'User 1',
          nickname: 'testuser1',
        },
        {
          userId: savedUsers[1].id,
          firstName: 'Test',
          lastName: 'User 2',
          nickname: 'testuser2',
        },
      ]);

      await profileRepository.save(profiles);
    }

    this.logger.log(`✓ ${savedUsers.length} user(s) seeded successfully`);
  }

  async clean(): Promise<void> {
    const hasUsers = await this.hasTable('users');
    if (!hasUsers) {
      return;
    }

    this.logger.log('Cleaning User data...');

    // Delete profiles first (if they exist)
    const hasProfile = await this.hasTable('profile');
    if (hasProfile) {
      await this.query(`
        DELETE FROM profile 
        WHERE "userId" IN (
          SELECT id FROM users WHERE email IN (${this.seededUserEmails.map((_, i) => `$${i + 1}`).join(', ')})
        )
      `, this.seededUserEmails);
    }

    // Delete users
    await this.query(`
      DELETE FROM users 
      WHERE email IN (${this.seededUserEmails.map((_, i) => `$${i + 1}`).join(', ')})
    `, this.seededUserEmails);

    this.logger.log('✓ User data cleaned');
  }
}

