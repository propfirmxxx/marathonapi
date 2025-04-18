import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../src/auth/auth.controller';
import { AuthService } from '../../src/auth/auth.service';
import { RegisterDto, LoginDto } from '../../src/users/dto/auth.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    initiateRegistration: jest.fn(),
    verifyEmail: jest.fn(),
    completeRegistration: jest.fn(),
    login: jest.fn(),
    googleLogin: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  describe('initiateRegistration', () => {
    it('should call authService.initiateRegistration with email', async () => {
      const email = 'test@example.com';
      const expectedResponse = { message: 'Verification code sent to your email' };

      mockAuthService.initiateRegistration.mockResolvedValue(expectedResponse);

      const result = await controller.initiateRegistration(email);

      expect(authService.initiateRegistration).toHaveBeenCalledWith(email);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('verifyEmail', () => {
    it('should call authService.verifyEmail with email and code', async () => {
      const email = 'test@example.com';
      const code = 'ABC123';
      const expectedResponse = { message: 'Email verified successfully' };

      mockAuthService.verifyEmail.mockResolvedValue(expectedResponse);

      const result = await controller.verifyEmail(email, code);

      expect(authService.verifyEmail).toHaveBeenCalledWith(email, code);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('completeRegistration', () => {
    it('should call authService.completeRegistration with registerDto', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const expectedResponse = {
        access_token: 'jwt-token',
        user: {
          id: 1,
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      mockAuthService.completeRegistration.mockResolvedValue(expectedResponse);

      const result = await controller.completeRegistration(registerDto);

      expect(authService.completeRegistration).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('login', () => {
    it('should call authService.login with loginDto', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const expectedResponse = {
        access_token: 'jwt-token',
        user: {
          id: 1,
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      mockAuthService.login.mockResolvedValue(expectedResponse);

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('googleAuthCallback', () => {
    it('should call authService.googleLogin with user profile', async () => {
      const profile = {
        id: 'google123',
        emails: [{ value: 'test@example.com' }],
        name: { givenName: 'John', familyName: 'Doe' },
        photos: [{ value: 'avatar.jpg' }],
      };

      const expectedResponse = {
        access_token: 'jwt-token',
        user: {
          id: 1,
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          avatar: 'avatar.jpg',
        },
      };

      mockAuthService.googleLogin.mockResolvedValue(expectedResponse);

      const result = await controller.googleAuthCallback({ user: profile });

      expect(authService.googleLogin).toHaveBeenCalledWith(profile);
      expect(result).toEqual(expectedResponse);
    });
  });
}); 