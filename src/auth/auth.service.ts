import { Injectable, UnauthorizedException, ConflictException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { EmailVerification } from '../users/entities/email-verification.entity';
import { PasswordReset } from '../users/entities/password-reset.entity';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from '../users/dto/auth.dto';
import { EmailService } from '../email/email.service';
import * as crypto from 'crypto';
import axios from 'axios';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(EmailVerification)
    private readonly emailVerificationRepository: Repository<EmailVerification>,
    @InjectRepository(PasswordReset)
    private readonly passwordResetRepository: Repository<PasswordReset>,
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

    const existingVerification = await this.emailVerificationRepository.findOne({
      where: { email },
      order: { createdAt: 'DESC' },
    });

    if (!existingVerification || existingVerification.expiresAt < new Date()) {
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
      return { message: code }
    } else {
      await this.emailService.sendVerificationCode(email, existingVerification.code);
      return { message: existingVerification.code }
    }

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

    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const user = this.userRepository.create(registerDto);
    await this.userRepository.save(user);

    return this.generateToken(user);
  }

  async login(loginDto: LoginDto): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
      select: ['id', 'email', 'password', 'firstName', 'lastName', 'avatar', 'isActive', 'role'],
    });

    if (!user || !(await user.validatePassword(loginDto.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateToken(user);
  }

  async handleOAuthCode(code: string) {
    try {
      const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      });

      const { access_token } = tokenRes.data;

      const userInfo = await this.getUserInfo(access_token);

      const user = await this.googleLogin(userInfo);

      return this.generateToken(user);
    } catch (err) {
      console.error('OAuth Error:', err.response?.data || err.message);
      throw new UnauthorizedException('Google login failed');
    }
  }

  private async getUserInfo(accessToken: string) {
    const { data } = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return {
      email: data.email,
      name: data.name,
      avatar: data.picture,
      googleId: data.id,
    };
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

    return user;
  }

  private generateToken(user: User) {
    const accessTokenPayload = { 
      sub: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      type: 'access'
    };

    const refreshTokenPayload = {
      sub: user.id,
      type: 'refresh'
    };

    return {
      access_token: this.jwtService.sign(accessTokenPayload, { expiresIn: '15m' }),
      refresh_token: this.jwtService.sign(refreshTokenPayload, { expiresIn: '7d' })
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
        select: ['id', 'email', 'firstName', 'lastName', 'avatar', 'role'],
      });

      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.generateToken(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.userRepository.findOne({
      where: { email: forgotPasswordDto.email },
    });

    if (!user) {
      return {
        message:
          'If an account exists with this email, a password reset link has been sent',
      };
    }

    const existingToken = await this.passwordResetRepository.findOne({
      where: {
        email: user.email,
        isUsed: false,
        expiresAt: MoreThan(new Date()),
      },
    });

    let token = "";
    if (existingToken) {
      token = existingToken.token;
    } else {
      token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);
  
      const passwordReset = this.passwordResetRepository.create({
        email: user.email,
        token,
        expiresAt,
      });
      await this.passwordResetRepository.save(passwordReset);
    }
    
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    await this.emailService.sendPasswordResetEmail(user.email, resetLink);

    return { message: 'If an account exists with this email, a password reset link has been sent' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const passwordReset = await this.passwordResetRepository.findOne({
      where: { token: resetPasswordDto.token, isUsed: false },
    });

    if (!passwordReset) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (passwordReset.expiresAt < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    const user = await this.userRepository.findOne({
      where: { email: passwordReset.email },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    user.password = resetPasswordDto.password;
    await this.userRepository.save(user);

    passwordReset.isUsed = true;
    await this.passwordResetRepository.save(passwordReset);

    return { message: 'Password has been reset successfully' };
  }
} 