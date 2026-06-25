'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getAuthErrorMessage, isEmailNotConfirmed } from '@/lib/auth/errors';
import { validateEmail, validatePassword } from '@/lib/auth/validation';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthAlert } from '@/components/auth/AuthAlert';
import { AuthInput } from '@/components/auth/AuthInput';
import { AuthDivider } from '@/components/auth/AuthDivider';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientButton } from '@/components/ui/GradientButton';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { useAuthForm } from '@/hooks/useAuthForm';

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get('redirect') || '/dashboard';
    const passwordResetSuccess = searchParams.get('reset') === 'success';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { loading, setLoading, error, setError, fieldErrors, setFieldErrors, clearFieldError } =
        useAuthForm<{ email?: string; password?: string }>();

    const supabase = createClient();

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const emailError = validateEmail(email);
        const passwordError = validatePassword(password);
        const nextFieldErrors: { email?: string; password?: string } = {};

        if (emailError) nextFieldErrors.email = emailError;
        if (passwordError) nextFieldErrors.password = passwordError;

        setFieldErrors(nextFieldErrors);
        if (emailError || passwordError) return;

        setLoading(true);

        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (signInError) {
                if (isEmailNotConfirmed(signInError)) {
                    router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`);
                    return;
                }
                throw signInError;
            }

            router.push(redirectTo);
            router.refresh();
        } catch (err: unknown) {
            setError(getAuthErrorMessage(err, 'Failed to sign in. Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        setLoading(true);

        try {
            const { error: oauthError } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback?redirect=${redirectTo}`,
                },
            });

            if (oauthError) throw oauthError;
        } catch (err: unknown) {
            setError(getAuthErrorMessage(err, 'Failed to sign in with Google'));
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            footer={
                <p className="mt-6 text-center text-xs text-muted-foreground">
                    By signing in, you agree to our terms of service.
                </p>
            }
        >
            <GlassCard>
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-semibold tracking-tight mb-2">Welcome back</h1>
                    <p className="text-muted-foreground text-sm">Sign in to continue</p>
                </div>

                {passwordResetSuccess && (
                    <AlertBanner variant="success" className="mb-6">
                        Your password has been updated. Sign in with your new password.
                    </AlertBanner>
                )}

                <AuthAlert error={error} />

                <GoogleAuthButton onClick={handleGoogleLogin} loading={loading} />

                <AuthDivider label="Or continue with email" />

                <form onSubmit={handleEmailLogin} className="space-y-4">
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

                    <AuthInput
                        id="password"
                        label="Password"
                        icon={Lock}
                        type="password"
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            clearFieldError('password');
                        }}
                        required
                        placeholder="••••••••"
                        error={fieldErrors.password}
                        labelExtra={
                            <Link
                                href="/forgot-password"
                                className="text-sm text-accent hover:underline transition-colors"
                            >
                                Forgot password?
                            </Link>
                        }
                    />

                    <GradientButton type="submit" loading={loading} loadingLabel="Signing in...">
                        Sign In
                    </GradientButton>
                </form>

                <p className="mt-6 text-center text-sm text-muted-foreground">
                    Don&apos;t have an account?{' '}
                    <Link href="/signup" className="text-accent hover:underline font-medium">
                        Sign up
                    </Link>
                </p>
            </GlassCard>
        </AuthLayout>
    );
}
