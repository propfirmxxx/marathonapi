import { EmailVerification } from '../../../src/users/entities/email-verification.entity';

describe('EmailVerification Entity', () => {
  let verification: EmailVerification;

  beforeEach(() => {
    verification = new EmailVerification();
  });

  it('should have required properties', () => {
    verification.email = 'test@example.com';
    verification.code = 'ABC123';
    verification.expiresAt = new Date();
    verification.isVerified = false;

    expect(verification.email).toBe('test@example.com');
    expect(verification.code).toBe('ABC123');
    expect(verification.expiresAt).toBeInstanceOf(Date);
    expect(verification.isVerified).toBe(false);
  });

  it('should update isVerified status', () => {
    verification.isVerified = true;
    expect(verification.isVerified).toBe(true);
  });
}); 