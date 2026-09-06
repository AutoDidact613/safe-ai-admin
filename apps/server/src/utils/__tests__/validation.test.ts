import { describe, it, expect } from '@jest/globals';
import { registerSchema } from '../validation';

describe('registerSchema', () => {
  const baseData = {
    password: 'Password1',
    name: 'Test User',
    organizationId: '6a00e26b1e9d916a4da16fd7',
  };

  it('accepts an email containing "+" for server-side registration handling', () => {
    const result = registerSchema.safeParse({
      ...baseData,
      email: 'user+tag@example.com',
    });

    expect(result.success).toBe(true);
  });

  it('accepts a valid email without "+"', () => {
    const result = registerSchema.safeParse({
      ...baseData,
      email: 'user@example.com',
    });

    expect(result.success).toBe(true);
  });
});
