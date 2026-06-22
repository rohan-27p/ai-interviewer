import type { AuthError } from '@supabase/supabase-js';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
    invalid_credentials:
        'Incorrect email or password. Please check your credentials and try again.',
    email_not_confirmed:
        'Your email is not verified yet. Enter the verification code we sent to your inbox.',
    user_already_registered:
        'An account with this email already exists. Please sign in instead.',
    email_exists: 'An account with this email already exists. Please sign in instead.',
    signup_disabled: 'New signups are currently disabled. Please try again later.',
    weak_password: 'Password is too weak. Use at least 6 characters with a mix of characters.',
    invalid_email: 'Please enter a valid email address.',
    over_email_send_rate_limit:
        'Too many emails sent. Please wait a few minutes before requesting another code.',
    over_request_rate_limit: 'Too many attempts. Please wait a moment and try again.',
    otp_expired: 'This verification code has expired. Request a new code and try again.',
    otp_disabled: 'Email verification is not enabled. Please contact support.',
    validation_failed: 'Please check your input and try again.',
};

function isAuthError(error: unknown): error is AuthError {
    return (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as AuthError).message === 'string'
    );
}

export function getAuthErrorCode(error: unknown): string | null {
    if (!isAuthError(error)) return null;
    return error.code ?? null;
}

export function isEmailNotConfirmed(error: unknown): boolean {
    const code = getAuthErrorCode(error);
    return code === 'email_not_confirmed';
}

export function getAuthErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
    if (!isAuthError(error)) {
        return error instanceof Error ? error.message : fallback;
    }

    if (error.code && AUTH_ERROR_MESSAGES[error.code]) {
        return AUTH_ERROR_MESSAGES[error.code];
    }

    const normalizedMessage = error.message.toLowerCase();

    if (normalizedMessage.includes('invalid login credentials')) {
        return AUTH_ERROR_MESSAGES.invalid_credentials;
    }

    if (normalizedMessage.includes('email not confirmed')) {
        return AUTH_ERROR_MESSAGES.email_not_confirmed;
    }

    if (normalizedMessage.includes('user already registered')) {
        return AUTH_ERROR_MESSAGES.user_already_registered;
    }

    return error.message || fallback;
}
