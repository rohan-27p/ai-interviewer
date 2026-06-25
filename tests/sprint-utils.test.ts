import { describe, it, expect } from 'vitest';
import { checkRateLimit } from '../src/lib/rate-limit';
import { validateEmail, validatePassword } from '../src/lib/auth/validation';
import { formatInterviewTypeForDb, formatInterviewTypeDisplay } from '../src/lib/interview-types';
import { parseStructuredTurnResponse } from '../src/lib/ai/turn-response';
import { getVerdictColor, getScoreColor } from '../src/lib/feedback-utils';
import { getSttLanguage, getDeepgramLiveConfig } from '../src/lib/stt';

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

describe('interview types', () => {
    it('maps slug to database enum', () => {
        expect(formatInterviewTypeForDb('dsa')).toBe('DSA');
        expect(formatInterviewTypeForDb('devops')).toBe('DevOps');
    });

    it('formats display labels', () => {
        expect(formatInterviewTypeDisplay('Cybersecurity')).toBe('Security');
        expect(formatInterviewTypeDisplay('frontend')).toBe('Frontend');
    });
});

describe('structured turn response', () => {
    it('parses JSON LLM output', () => {
        const result = parseStructuredTurnResponse(
            '{"reply":"Good answer.","status":"CONTINUE"}'
        );
        expect(result.reply).toBe('Good answer.');
        expect(result.status).toBe('CONTINUE');
    });

    it('falls back to legacy status tags', () => {
        const result = parseStructuredTurnResponse('Nice work. [STATUS:COMPLETE]');
        expect(result.status).toBe('COMPLETE');
        expect(result.reply).toBe('Nice work.');
    });
});

describe('feedback utils', () => {
    it('returns verdict colors', () => {
        expect(getVerdictColor('Strong Hire')).toContain('green');
        expect(getVerdictColor('No Hire')).toContain('red');
    });

    it('returns score colors', () => {
        expect(getScoreColor(9)).toContain('green');
        expect(getScoreColor(4)).toContain('red');
    });
});

describe('stt config', () => {
    it('maps voice id to language', () => {
        expect(getSttLanguage('en-UK-finley')).toBe('en-GB');
    });

    it('builds live config', () => {
        expect(getDeepgramLiveConfig('en-US-matthew').encoding).toBe('webm');
    });
});
