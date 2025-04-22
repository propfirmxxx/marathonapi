import { Controller, Post, Body, UseGuards, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from '../users/dto/auth.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Initiate user registration' })
  @ApiResponse({ 
    status: 201, 
    description: 'Registration initiation email sent',
    schema: {
      example: {
        message: 'Verification email sent successfully',
        email: 'john.doe@example.com'
      }
    }
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
    schema: {
      example: {
        message: 'Email verified successfully',
        email: 'john.doe@example.com',
        token: 'verification_token'
      }
    }
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
    schema: {
      example: {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        role: 'resource',
        isActive: true,
        createdAt: '2024-04-22T12:00:00Z',
        updatedAt: '2024-04-22T12:00:00Z'
      }
    }
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
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          role: 'resource',
          isActive: true
        }
      }
    }
  })
  @ApiBody({ type: LoginDto })
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ 
    status: 200, 
    description: 'Password reset email sent',
    schema: {
      example: {
        message: 'Password reset email sent successfully',
        email: 'john.doe@example.com'
      }
    }
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
    schema: {
      example: {
        message: 'Password reset successfully',
        email: 'john.doe@example.com'
      }
    }
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
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
      }
    }
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
  @ApiResponse({ 
    status: 200, 
    description: 'Google login successful',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          role: 'resource',
          isActive: true,
          googleId: '123456789',
          avatar: 'https://lh3.googleusercontent.com/...'
        }
      }
    }
  })
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req) {
    return this.authService.googleLogin(req.user);
  }
} 