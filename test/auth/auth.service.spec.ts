import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../src/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../../src/email/email.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../src/users/entities/user.entity';
import { EmailVerification } from '../../src/users/entities/email-verification.entity';
import { Repository } from 'typeorm';
import { RegisterDto, LoginDto } from '../../src/users/dto/auth.dto';
import { UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let emailVerificationRepository: Repository<EmailVerification>;
  let jwtService: JwtService;
  let emailService: EmailService;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockEmailVerificationRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  };

  const mockEmailService = {
    sendVerificationCode: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(EmailVerification),
          useValue: mockEmailVerificationRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    emailVerificationRepository = module.get<Repository<EmailVerification>>(
      getRepositoryToken(EmailVerification),
    );
    jwtService = module.get<JwtService>(JwtService);
    emailService = module.get<EmailService>(EmailService);
  });

  describe('initiateRegistration', () => {
    it('should throw ConflictException if user already exists', async () => {
      mockUserRepository.findOne.mockResolvedValue({ email: 'test@example.com' });

      await expect(service.initiateRegistration('test@example.com')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create and save verification code', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockEmailVerificationRepository.create.mockReturnValue({
        email: 'test@example.com',
        code: 'ABC123',
        expiresAt: new Date(),
      });

      const result = await service.initiateRegistration('test@example.com');

      expect(mockEmailVerificationRepository.create).toHaveBeenCalled();
      expect(mockEmailVerificationRepository.save).toHaveBeenCalled();
      expect(mockEmailService.sendVerificationCode).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Verification code sent to your email' });
    });
  });

  describe('verifyEmail', () => {
    it('should throw BadRequestException for invalid code', async () => {
      mockEmailVerificationRepository.findOne.mockResolvedValue(null);

      await expect(service.verifyEmail('test@example.com', 'INVALID')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for expired code', async () => {
      const expiredDate = new Date();
      expiredDate.setMinutes(expiredDate.getMinutes() - 11);

      mockEmailVerificationRepository.findOne.mockResolvedValue({
        email: 'test@example.com',
        code: 'ABC123',
        expiresAt: expiredDate,
        isVerified: false,
      });

      await expect(service.verifyEmail('test@example.com', 'ABC123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should verify email successfully', async () => {
      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 10);

      const verification = {
        email: 'test@example.com',
        code: 'ABC123',
        expiresAt: futureDate,
        isVerified: false,
      };

      mockEmailVerificationRepository.findOne.mockResolvedValue(verification);

      const result = await service.verifyEmail('test@example.com', 'ABC123');

      expect(verification.isVerified).toBe(true);
      expect(mockEmailVerificationRepository.save).toHaveBeenCalledWith(verification);
      expect(result).toEqual({ message: 'Email verified successfully' });
    });
  });

  describe('completeRegistration', () => {
    it('should throw BadRequestException if email not verified', async () => {
      mockEmailVerificationRepository.findOne.mockResolvedValue(null);

      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      await expect(service.completeRegistration(registerDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create user and return token', async () => {
      mockEmailVerificationRepository.findOne.mockResolvedValue({
        email: 'test@example.com',
        isVerified: true,
      });

      const user = {
        id: 1,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      mockUserRepository.create.mockReturnValue(user);
      mockUserRepository.save.mockResolvedValue(user);

      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = await service.completeRegistration(registerDto);

      expect(mockUserRepository.create).toHaveBeenCalledWith(registerDto);
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException for invalid credentials', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should return token for valid credentials', async () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        password: 'hashedpassword',
        validatePassword: jest.fn().mockResolvedValue(true),
      };

      mockUserRepository.findOne.mockResolvedValue(user);

      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
    });
  });

  describe('googleLogin', () => {
    it('should link Google account to existing user', async () => {
      const existingUser = {
        id: 1,
        email: 'test@example.com',
        googleId: null,
      };

      const googleProfile = {
        id: 'google123',
        emails: [{ value: 'test@example.com' }],
        name: { givenName: 'John', familyName: 'Doe' },
        photos: [{ value: 'avatar.jpg' }],
      };

      mockUserRepository.findOne
        .mockResolvedValueOnce(null) // First call for googleId
        .mockResolvedValueOnce(existingUser); // Second call for email

      const result = await service.googleLogin(googleProfile);

      expect(mockUserRepository.save).toHaveBeenCalledWith({
        ...existingUser,
        googleId: googleProfile.id,
      });
      expect(result).toHaveProperty('access_token');
    });

    it('should create new user for Google login', async () => {
      const googleProfile = {
        id: 'google123',
        emails: [{ value: 'new@example.com' }],
        name: { givenName: 'John', familyName: 'Doe' },
        photos: [{ value: 'avatar.jpg' }],
      };

      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.googleLogin(googleProfile);

      expect(mockUserRepository.create).toHaveBeenCalledWith({
        googleId: googleProfile.id,
        email: googleProfile.emails[0].value,
        firstName: googleProfile.name.givenName,
        lastName: googleProfile.name.familyName,
        avatar: googleProfile.photos[0].value,
      });
      expect(result).toHaveProperty('access_token');
    });
  });
}); 