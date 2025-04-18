import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from '../../src/email/email.service';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn(),
  }),
}));

describe('EmailService', () => {
  let service: EmailService;
  let transporter: nodemailer.Transporter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailService],
    }).compile();

    service = module.get<EmailService>(EmailService);
    transporter = nodemailer.createTransport({} as any);
  });

  describe('sendVerificationCode', () => {
    it('should send verification email with correct parameters', async () => {
      const email = 'test@example.com';
      const code = 'ABC123';

      await service.sendVerificationCode(email, code);

      expect(transporter.sendMail).toHaveBeenCalledWith({
        from: process.env.SMTP_FROM || '"No Reply" <noreply@example.com>',
        to: email,
        subject: 'Email Verification Code',
        html: expect.stringContaining(code),
      });
    });

    it('should handle email sending errors', async () => {
      const email = 'test@example.com';
      const code = 'ABC123';

      (transporter.sendMail as jest.Mock).mockRejectedValue(new Error('SMTP Error'));

      await expect(service.sendVerificationCode(email, code)).rejects.toThrow('SMTP Error');
    });
  });
}); 