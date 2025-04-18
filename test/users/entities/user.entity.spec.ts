import { User } from '../../../src/users/entities/user.entity';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedpassword'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('User Entity', () => {
  let user: User;

  beforeEach(() => {
    user = new User();
  });

  describe('hashPassword', () => {
    it('should hash password before insert', async () => {
      user.password = 'password123';
      await user.hashPassword();

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(user.password).toBe('hashedpassword');
    });
  });

  describe('validatePassword', () => {
    it('should return false if password is not set', async () => {
      user.password = undefined;
      const isValid = await user.validatePassword('password123');

      expect(isValid).toBe(false);
    });

    it('should validate password using bcrypt', async () => {
      user.password = 'hashedpassword';
      const isValid = await user.validatePassword('password123');

      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedpassword');
      expect(isValid).toBe(true);
    });
  });
}); 