import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole } from './users/entities/user.entity';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  /**
   * Generate admin token without expiration (DEV ONLY)
   * This method should only be used in development environment
   */
  async generateDevAdminToken(): Promise<{ access_token: string; user: any }> {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
      throw new ForbiddenException('This endpoint is only available in development mode');
    }

    // Find or create admin user
    let adminUser = await this.userRepository.findOne({
      where: { role: UserRole.ADMIN },
      select: ['id', 'email', 'role'],
    });

    if (!adminUser) {
      // Create a default admin user if none exists
      adminUser = this.userRepository.create({
        email: 'admin@dev.local',
        password: 'dev-admin-password', // This will be hashed by BeforeInsert hook
        role: UserRole.ADMIN,
        isActive: true,
        isBanned: false,
      });
      adminUser = await this.userRepository.save(adminUser);
    }

    // Generate token without expiration
    const payload = {
      type: 'access',
      sub: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    };

    // Sign token without expiration (for dev only)
    // Note: Some JWT libraries don't support undefined expiresIn,
    // so we use a very far future date (year 9999)
    const access_token = this.jwtService.sign(payload, {
      expiresIn: '9999y', // Effectively no expiration
    });

    return {
      access_token,
      user: {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      },
    };
  }
}
