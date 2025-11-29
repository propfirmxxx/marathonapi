import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private readonly logoSvg: string;
  private readonly baseTemplate: string;
  private readonly verificationCodeTemplate: string;
  private readonly passwordResetTemplate: string;
  
  constructor() {
    // Load logo SVG from file
    this.logoSvg = this.loadFile('assets', 'logo.svg', true);

    // Load email templates
    this.baseTemplate = this.loadFile('templates', 'base.html', false);
    this.verificationCodeTemplate = this.loadFile(
      'templates',
      'verification-code.html',
      false,
    );
    this.passwordResetTemplate = this.loadFile(
      'templates',
      'password-reset.html',
      false,
    );

    const smtpConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '', 10) || 587,
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000, // 10 seconds
      socketTimeout: 10000, // 10 seconds
      pool: true, // Use connection pooling
      maxConnections: 5,
      maxMessages: 100,
    };

    this.transporter = nodemailer.createTransport(smtpConfig);

    // Verify connection on startup (optional, but helpful for debugging)
    this.verifyConnection().catch((error) => {
      this.logger.warn(`SMTP connection verification failed: ${error.message}`);
    });
  }

  private loadFile(
    subDir: string,
    filename: string,
    optional: boolean = false,
  ): string {
    // Try multiple paths: dist (production), src (development), and project root
    const possiblePaths = [
      path.join(__dirname, subDir, filename), // dist/email/assets or src/email/assets
      path.join(__dirname, '..', '..', 'src', 'email', subDir, filename), // Fallback to src
      path.join(process.cwd(), 'src', 'email', subDir, filename), // Project root/src
      path.join(process.cwd(), 'dist', 'email', subDir, filename), // Project root/dist
    ];

    for (const filePath of possiblePaths) {
      try {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          this.logger.log(`Loaded ${filename} from ${filePath}`);
          return content;
        }
      } catch (error) {
        // Continue to next path
        continue;
      }
    }

    // If file not found
    const errorMsg = `Failed to load ${subDir}/${filename} from any of the attempted paths`;
    if (optional) {
      this.logger.warn(`${errorMsg}. Using empty fallback.`);
      return '';
    } else {
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }
  }

  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified successfully');
    } catch (error) {
      this.logger.error(`SMTP connection verification failed: ${error.message}`);
      throw error;
    }
  }

  private getLogo(): string {
    // Add inline styles to the SVG for email compatibility
    const styledSvg = this.logoSvg.replace(
      '<svg',
      '<svg width="200" height="94" style="max-width: 200px; height: auto;"'
    );
    return styledSvg;
  }

  private renderTemplate(
    template: string,
    variables: Record<string, string>,
  ): string {
    let rendered = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, value);
    }
    return rendered;
  }

  private getEmailTemplate(content: string): string {
    const logo = this.getLogo();
    const year = new Date().getFullYear().toString();

    return this.renderTemplate(this.baseTemplate, {
      logo,
      content,
      year,
    });
  }

  async sendVerificationCode(email: string, code: string) {
    const content = this.renderTemplate(this.verificationCodeTemplate, {
      code,
    });

    const mailOptions = {
      from: process.env.SMTP_FROM || '"Marathon" <noreply@example.com>',
      to: email,
      subject: 'Email Verification Code - Marathon',
      html: this.getEmailTemplate(content),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Verification code sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification code to ${email}: ${error.message}`);
      throw error;
    }
  }

  async sendPasswordResetEmail(email: string, resetLink: string) {
    const content = this.renderTemplate(this.passwordResetTemplate, {
      resetLink,
    });

    const mailOptions = {
      from: process.env.SMTP_FROM || '"Marathon" <noreply@example.com>',
      to: email,
      subject: 'Password Reset Request - Marathon',
      html: this.getEmailTemplate(content),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}: ${error.message}`);
      throw error;
    }
  }
} 