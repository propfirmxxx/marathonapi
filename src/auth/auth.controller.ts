import { Controller, Post, Body, UseGuards, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from '../users/dto/auth.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { 
  InitiateRegistrationResponseDto, 
  VerifyEmailResponseDto, 
  LoginResponseDto, 
  PasswordResetResponseDto, 
  GoogleAuthResponseDto 
} from './dto/auth-response.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Initiate user registration' })
  @ApiResponse({ 
    status: 201, 
    description: 'Registration initiation email sent',
    type: InitiateRegistrationResponseDto
  })
  @ApiBody({ 
    schema: { 
      type: 'object', 
      properties: { 
        email: { 
          type: 'string', 
          description: 'User email address',
          example: 'john.doe@example.com'
        } 
      }, 
      required: ['email'] 
    } 
  })
  @Post('register/initiate')
  async initiateRegistration(@Body('email') email: string) {
    return this.authService.initiateRegistration(email);
  }

  @ApiOperation({ summary: 'Verify email with code' })
  @ApiResponse({ 
    status: 200, 
    description: 'Email verified successfully',
    type: VerifyEmailResponseDto
  })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        email: { 
          type: 'string', 
          description: 'User email address',
          example: 'john.doe@example.com'
        },
        code: { 
          type: 'string', 
          description: 'Verification code sent to email',
          example: '123456'
        }
      },
      required: ['email', 'code']
    }
  })
  @Post('register/verify')
  async verifyEmail(
    @Body('email') email: string,
    @Body('code') code: string,
  ) {
    return this.authService.verifyEmail(email, code);
  }

  @ApiOperation({ summary: 'Complete user registration' })
  @ApiResponse({ 
    status: 201, 
    description: 'User registered successfully',
    type: RegisterDto
  })
  @ApiBody({ type: RegisterDto })
  @Post('register/complete')
  async completeRegistration(@Body() registerDto: RegisterDto) {
    return this.authService.completeRegistration(registerDto);
  }

  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful',
    type: LoginResponseDto
  })
  @ApiBody({ type: LoginDto })
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req: any) {
    return this.authService.login(loginDto, req);
  }

  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ 
    status: 200, 
    description: 'Password reset email sent',
    type: PasswordResetResponseDto
  })
  @ApiBody({ type: ForgotPasswordDto })
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @ApiOperation({ summary: 'Reset password' })
  @ApiResponse({ 
    status: 200, 
    description: 'Password reset successful',
    type: PasswordResetResponseDto
  })
  @ApiBody({ type: ResetPasswordDto })
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ 
    status: 200, 
    description: 'Token refreshed successfully',
    type: LoginResponseDto
  })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        refresh_token: { 
          type: 'string', 
          description: 'Refresh token',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        }
      },
      required: ['refresh_token']
    }
  })
  @Post('refresh')
  async refreshToken(@Body('refresh_token') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  @ApiOperation({ summary: 'Initiate Google OAuth' })
  @ApiResponse({ 
    status: 302, 
    description: 'Redirects to Google OAuth',
    schema: {
      example: {
        url: 'https://accounts.google.com/o/oauth2/v2/auth?...'
      }
    }
  })
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // This endpoint initiates Google OAuth flow
  }

  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        code: { 
          type: 'string', 
          description: 'Google callback code',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        }
      },
      required: ['code']
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Google login successful',
    type: GoogleAuthResponseDto
  })
  @Post('google/verify')
  async exchangeGoogleCode(@Body('code') code: string, @Req() req: any) {
    return this.authService.handleOAuthCode(code, req);
  }
} 