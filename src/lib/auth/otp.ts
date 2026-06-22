import type { EmailOtpType, SupabaseClient } from '@supabase/supabase-js';

export type AuthOtpResendType = 'signup' | 'recovery';

const RESEND_TYPE_MAP: Record<AuthOtpResendType, EmailOtpType> = {
    signup: 'signup',
    recovery: 'recovery',
};

export async function resendAuthOtp(
    supabase: SupabaseClient,
    email: string,
    type: AuthOtpResendType
) {
    return supabase.auth.resend({
        type: RESEND_TYPE_MAP[type],
        email: email.trim(),
    });
}

export async function requestPasswordReset(
    supabase: SupabaseClient,
    email: string,
    redirectTo?: string
) {
    return supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
    });
}
