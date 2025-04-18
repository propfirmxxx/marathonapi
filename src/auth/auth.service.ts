import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { EmailVerification } from '../users/entities/email-verification.entity';
import { RegisterDto, LoginDto } from '../users/dto/auth.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(EmailVerification)
    private readonly emailVerificationRepository: Repository<EmailVerification>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async initiateRegistration(email: string) {
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    const verification = this.emailVerificationRepository.create({
      email,
      code,
      expiresAt,
    });

    await this.emailVerificationRepository.save(verification);
    await this.emailService.sendVerificationCode(email, code);

    return { message: 'Verification code sent to your email' };
  }

  async verifyEmail(email: string, code: string) {
    const verification = await this.emailVerificationRepository.findOne({
      where: { email, code, isVerified: false },
    });

    if (!verification) {
      throw new BadRequestException('Invalid verification code');
    }

    if (verification.expiresAt < new Date()) {
      throw new BadRequestException('Verification code has expired');
    }

    verification.isVerified = true;
    await this.emailVerificationRepository.save(verification);

    return { message: 'Email verified successfully' };
  }

  async completeRegistration(registerDto: RegisterDto) {
    const verification = await this.emailVerificationRepository.findOne({
      where: { email: registerDto.email, isVerified: true },
    });

    if (!verification) {
      throw new BadRequestException('Email not verified');
    }

    const user = this.userRepository.create(registerDto);
    await this.userRepository.save(user);

    return this.generateToken(user);
  }

  async login(loginDto: LoginDto): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!user || !(await user.validatePassword(loginDto.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateToken(user);
  }

  async googleLogin(profile: any) {
    let user = await this.userRepository.findOne({
      where: { googleId: profile.id },
    });

    if (!user) {
      user = await this.userRepository.findOne({
        where: { email: profile.emails[0].value },
      });

      if (user) {
        // Link Google account to existing user
        user.googleId = profile.id;
        await this.userRepository.save(user);
      } else {
        // Create new user from Google profile
        user = this.userRepository.create({
          googleId: profile.id,
          email: profile.emails[0].value,
          firstName: profile.name.givenName,
          lastName: profile.name.familyName,
          avatar: profile.photos[0]?.value,
        });
        await this.userRepository.save(user);
      }
    }

    return this.generateToken(user);
  }

  private generateToken(user: User) {
    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
      },
    };
  }
} 