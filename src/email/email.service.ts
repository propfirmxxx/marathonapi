import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '', 10) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendVerificationCode(email: string, code: string) {
    const mailOptions = {
      from: process.env.SMTP_FROM || '"No Reply" <noreply@example.com>',
      to: email,
      subject: 'Email Verification Code',
      html: `
        <h1>Email Verification</h1>
        <p>Your verification code is: <strong>${code}</strong></p>
        <p>This code will expire in 10 minutes.</p>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendPasswordResetEmail(email: string, resetLink: string) {
    const mailOptions = {
      from: process.env.SMTP_FROM || '"No Reply" <noreply@example.com>',
      to: email,
      subject: 'Password Reset Request',
      html: `
        <h1>Password Reset</h1>
        <p>You have requested to reset your password. Click the link below to proceed:</p>
        <p><a href="${resetLink}">Reset Password</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request this password reset, please ignore this email.</p>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }
} 