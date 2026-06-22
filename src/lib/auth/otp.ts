import type { SupabaseClient } from '@supabase/supabase-js';

export type AuthOtpResendType = 'signup' | 'recovery';

export async function resendAuthOtp(
    supabase: SupabaseClient,
    email: string,
    type: AuthOtpResendType,
    redirectTo?: string
) {
    const trimmedEmail = email.trim();

    if (type === 'recovery') {
        return supabase.auth.resetPasswordForEmail(trimmedEmail, {
            redirectTo,
        });
    }

    return supabase.auth.resend({
        type: 'signup',
        email: trimmedEmail,
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
