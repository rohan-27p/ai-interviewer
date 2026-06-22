import { describe, it, expect } from 'vitest';
import { checkRateLimit } from '../src/lib/rate-limit';
import { validateEmail, validatePassword } from '../src/lib/auth/validation';

describe('rate-limit', () => {
    it('allows requests under the limit', () => {
        const key = `test-${Date.now()}`;
        expect(checkRateLimit(key, 3, 1000).allowed).toBe(true);
        expect(checkRateLimit(key, 3, 1000).allowed).toBe(true);
    });

    it('blocks requests over the limit', () => {
        const key = `test-block-${Date.now()}`;
        checkRateLimit(key, 2, 1000);
        checkRateLimit(key, 2, 1000);
        expect(checkRateLimit(key, 2, 1000).allowed).toBe(false);
    });
});

describe('auth validation', () => {
    it('validates email format', () => {
        expect(validateEmail('bad')).toBeTruthy();
        expect(validateEmail('user@example.com')).toBeNull();
    });

    it('validates password length', () => {
        expect(validatePassword('123')).toBeTruthy();
        expect(validatePassword('abcdef')).toBeNull();
    });
});
