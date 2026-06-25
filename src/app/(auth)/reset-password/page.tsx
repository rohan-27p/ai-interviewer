'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getAuthErrorMessage } from '@/lib/auth/errors';
import { resendAuthOtp } from '@/lib/auth/otp';
import { validateEmail, validatePassword, validateVerificationCode } from '@/lib/auth/validation';
import { useResendCooldown } from '@/hooks/useResendCooldown';
import { useAuthForm } from '@/hooks/useAuthForm';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthAlert } from '@/components/auth/AuthAlert';
import { OtpFormFields } from '@/components/auth/OtpFormFields';
import { PasswordFields } from '@/components/auth/PasswordFields';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientButton } from '@/components/ui/GradientButton';

export default function ResetPasswordPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialEmail = searchParams.get('email') || '';

    const [email, setEmail] = useState(initialEmail);
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
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
    } = useAuthForm<{
        email?: string;
        code?: string;
        password?: string;
        confirmPassword?: string;
    }>();

    const { cooldown, startCooldown, isCoolingDown } = useResendCooldown();
    const supabase = createClient();

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        clearMessages();

        const nextFieldErrors: {
            email?: string;
            code?: string;
            password?: string;
            confirmPassword?: string;
        } = {};

        const emailError = validateEmail(email);
        if (emailError) nextFieldErrors.email = emailError;

        const codeError = validateVerificationCode(code);
        if (codeError) nextFieldErrors.code = codeError;

        const passwordError = validatePassword(password);
        if (passwordError) nextFieldErrors.password = passwordError;

        if (password !== confirmPassword) {
            nextFieldErrors.confirmPassword = 'Passwords do not match.';
        }

        setFieldErrors(nextFieldErrors);
        if (Object.keys(nextFieldErrors).length > 0) return;

        setLoading(true);

        try {
            const { error: verifyError } = await supabase.auth.verifyOtp({
                email: email.trim(),
                token: code.trim(),
                type: 'recovery',
            });

            if (verifyError) throw verifyError;

            const { error: updateError } = await supabase.auth.updateUser({ password });

            if (updateError) throw updateError;

            setSuccess('Password updated successfully. Redirecting to sign in...');
            router.push('/login?reset=success');
            router.refresh();
        } catch (err: unknown) {
            setError(getAuthErrorMessage(err, 'Failed to reset password. Please try again.'));
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
            const { error: resendError } = await resendAuthOtp(
                supabase,
                email,
                'recovery',
                `${window.location.origin}/reset-password`
            );

            if (resendError) throw resendError;

            setSuccess('A new reset code has been sent to your email.');
            startCooldown();
        } catch (err: unknown) {
            setError(getAuthErrorMessage(err, 'Failed to send reset code. Please try again.'));
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <AuthLayout>
            <GlassCard>
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2">Reset Password</h1>
                    <p className="text-text-secondary">
                        Enter the code from your email and choose a new password
                    </p>
                </div>

                <AuthAlert error={error} success={success} />

                <form onSubmit={handleReset} className="space-y-4">
                    <OtpFormFields
                        email={email}
                        code={code}
                        onEmailChange={setEmail}
                        onCodeChange={setCode}
                        fieldErrors={fieldErrors}
                        onClearFieldError={clearFieldError}
                        codeLabel="Reset Code"
                    />

                    <PasswordFields
                        password={password}
                        confirmPassword={confirmPassword}
                        onPasswordChange={setPassword}
                        onConfirmPasswordChange={setConfirmPassword}
                        fieldErrors={fieldErrors}
                        onClearFieldError={clearFieldError}
                        passwordLabel="New Password"
                        confirmLabel="Confirm New Password"
                    />

                    <GradientButton type="submit" loading={loading} loadingLabel="Updating...">
                        Update Password
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
                              : 'Resend reset code'}
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
