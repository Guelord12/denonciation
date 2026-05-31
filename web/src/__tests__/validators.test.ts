import { describe, it, expect } from 'vitest';
import { validateEmail, validateUsername, validatePhone } from '../utils/validators';

describe('Web validators', () => {
  it('validates a good email address', () => {
    expect(validateEmail('test@example.com')).toBe(true);
  });

  it('rejects an invalid username', () => {
    expect(validateUsername('!invalid_user')).toBe(false);
  });

  it('accepts a valid phone number', () => {
    expect(validatePhone('+33123456789')).toBe(true);
  });
});
