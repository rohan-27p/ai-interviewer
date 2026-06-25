'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getAuthErrorMessage } from '@/lib/auth/errors';
import { requestPasswordReset } from '@/lib/auth/otp';
import { validateEmail } from '@/lib/auth/validation';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthAlert } from '@/components/auth/AuthAlert';
import { AuthInput } from '@/components/auth/AuthInput';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientButton } from '@/components/ui/GradientButton';
import { useAuthForm } from '@/hooks/useAuthForm';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const { loading, setLoading, error, setError, fieldErrors, setFieldErrors, clearFieldError } =
        useAuthForm<{ email?: string }>();

    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const emailError = validateEmail(email);
        if (emailError) {
            setFieldErrors({ email: emailError });
            return;
        }

        setFieldErrors({});
        setLoading(true);

        try {
            const redirectTo = `${window.location.origin}/reset-password`;
            const { error: resetError } = await requestPasswordReset(supabase, email, redirectTo);

            if (resetError) throw resetError;

            router.push(`/reset-password?email=${encodeURIComponent(email.trim())}`);
        } catch (err: unknown) {
            setError(getAuthErrorMessage(err, 'Failed to send reset code. Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout>
            <GlassCard>
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2">Forgot Password</h1>
                    <p className="text-text-secondary">
                        Enter your email and we&apos;ll send you a reset code
                    </p>
                </div>

                <AuthAlert error={error} />

                <form onSubmit={handleSubmit} className="space-y-4">
                    <AuthInput
                        id="email"
                        label="Email"
                        icon={Mail}
                        type="email"
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            clearFieldError('email');
                        }}
                        required
                        placeholder="you@example.com"
                        error={fieldErrors.email}
                    />

                    <GradientButton type="submit" loading={loading} loadingLabel="Sending...">
                        Send Reset Code
                    </GradientButton>
                </form>

                <div className="mt-6 flex justify-center">
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
