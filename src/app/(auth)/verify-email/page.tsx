'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getAuthErrorMessage } from '@/lib/auth/errors';
import { resendAuthOtp } from '@/lib/auth/otp';
import { validateEmail, validateVerificationCode } from '@/lib/auth/validation';
import { useResendCooldown } from '@/hooks/useResendCooldown';
import { useAuthForm } from '@/hooks/useAuthForm';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthAlert } from '@/components/auth/AuthAlert';
import { OtpFormFields } from '@/components/auth/OtpFormFields';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientButton } from '@/components/ui/GradientButton';

export default function VerifyEmailPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialEmail = searchParams.get('email') || '';

    const [email, setEmail] = useState(initialEmail);
    const [code, setCode] = useState('');
    const [resendLoading, setResendLoading] = useState(false);
    const {
        loading,
        setLoading,
        error,
        setError,
        success,
        setSuccess,
        fieldErrors,
        setFieldErrors,
        clearFieldError,
        clearMessages,
    } = useAuthForm<{ email?: string; code?: string }>();

    const { cooldown, startCooldown, isCoolingDown } = useResendCooldown();
    const supabase = createClient();

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        clearMessages();

        const emailError = validateEmail(email);
        const codeError = validateVerificationCode(code);
        const nextFieldErrors: { email?: string; code?: string } = {};

        if (emailError) nextFieldErrors.email = emailError;
        if (codeError) nextFieldErrors.code = codeError;

        setFieldErrors(nextFieldErrors);
        if (emailError || codeError) return;

        setLoading(true);

        try {
            const { error: verifyError } = await supabase.auth.verifyOtp({
                email: email.trim(),
                token: code.trim(),
                type: 'signup',
            });

            if (verifyError) throw verifyError;

            setSuccess('Email verified successfully. Redirecting...');
            router.push('/dashboard');
            router.refresh();
        } catch (err: unknown) {
            setError(getAuthErrorMessage(err, 'Invalid verification code. Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        clearMessages();

        const emailError = validateEmail(email);
        if (emailError) {
            setFieldErrors({ email: emailError });
            return;
        }

        if (isCoolingDown) return;

        setResendLoading(true);

        try {
            const { error: resendError } = await resendAuthOtp(supabase, email, 'signup');

            if (resendError) throw resendError;

            setSuccess('A new verification code has been sent to your email.');
            startCooldown();
        } catch (err: unknown) {
            setError(getAuthErrorMessage(err, 'Failed to send verification code. Please try again.'));
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <AuthLayout
            footer={
                <p className="mt-6 text-center text-xs text-text-muted">
                    Check your spam folder if you don&apos;t see the email within a few minutes.
                </p>
            }
        >
            <GlassCard>
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2">Verify Your Email</h1>
                    <p className="text-text-secondary">
                        Enter the 6-digit code we sent to your email address
                    </p>
                </div>

                <AuthAlert error={error} success={success} />

                <form onSubmit={handleVerify} className="space-y-4">
                    <OtpFormFields
                        email={email}
                        code={code}
                        onEmailChange={setEmail}
                        onCodeChange={setCode}
                        fieldErrors={fieldErrors}
                        onClearFieldError={clearFieldError}
                    />

                    <GradientButton type="submit" loading={loading} loadingLabel="Verifying...">
                        Verify Email
                    </GradientButton>
                </form>

                <div className="mt-6 flex flex-col items-center gap-3">
                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={resendLoading || isCoolingDown}
                        className="text-sm text-orange-400 hover:text-orange-300 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {resendLoading
                            ? 'Sending code...'
                            : isCoolingDown
                              ? `Resend code in ${cooldown}s`
                              : 'Resend verification code'}
                    </button>

                    <Link
                        href="/login"
                        className="flex items-center gap-2 text-sm text-text-secondary hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to sign in
                    </Link>
                </div>
            </GlassCard>
        </AuthLayout>
    );
}
