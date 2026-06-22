const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
    const trimmed = email.trim();

    if (!trimmed) {
        return 'Email is required.';
    }

    if (!EMAIL_PATTERN.test(trimmed)) {
        return 'Please enter a valid email address.';
    }

    return null;
}

export function validatePassword(password: string, minLength = 6): string | null {
    if (!password) {
        return 'Password is required.';
    }

    if (password.length < minLength) {
        return `Password must be at least ${minLength} characters.`;
    }

    return null;
}

export function validateVerificationCode(code: string): string | null {
    const trimmed = code.trim();

    if (!trimmed) {
        return 'Verification code is required.';
    }

    if (!/^\d{6,8}$/.test(trimmed)) {
        return 'Enter the 6-digit code from your email.';
    }

    return null;
}
