'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getAuthErrorMessage } from '@/lib/auth/errors';
import { validateEmail, validatePassword } from '@/lib/auth/validation';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthAlert } from '@/components/auth/AuthAlert';
import { AuthInput } from '@/components/auth/AuthInput';
import { AuthDivider } from '@/components/auth/AuthDivider';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { PasswordFields } from '@/components/auth/PasswordFields';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientButton } from '@/components/ui/GradientButton';
import { useAuthForm } from '@/hooks/useAuthForm';

export default function SignupPage() {
    const router = useRouter();

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const { loading, setLoading, error, setError, fieldErrors, setFieldErrors, clearFieldError } =
        useAuthForm<{
            fullName?: string;
            email?: string;
            password?: string;
            confirmPassword?: string;
        }>();

    const supabase = createClient();

    const handleEmailSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const nextFieldErrors: {
            fullName?: string;
            email?: string;
            password?: string;
            confirmPassword?: string;
        } = {};

        if (!fullName.trim()) {
            nextFieldErrors.fullName = 'Full name is required.';
        }

        const emailError = validateEmail(email);
        if (emailError) nextFieldErrors.email = emailError;

        const passwordError = validatePassword(password);
        if (passwordError) nextFieldErrors.password = passwordError;

        if (password !== confirmPassword) {
            nextFieldErrors.confirmPassword = 'Passwords do not match.';
        }

        setFieldErrors(nextFieldErrors);
        if (Object.keys(nextFieldErrors).length > 0) return;

        setLoading(true);

        try {
            const { data, error: signUpError } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: {
                    data: {
                        full_name: fullName.trim(),
                    },
                },
            });

            if (signUpError) throw signUpError;

            if (data.user?.identities?.length === 0) {
                setError('An account with this email already exists. Please sign in instead.');
                return;
            }

            if (data.user && !data.session) {
                router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`);
                return;
            }

            router.push('/dashboard');
            router.refresh();
        } catch (err: unknown) {
            setError(getAuthErrorMessage(err, 'Failed to create account. Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignup = async () => {
        setError('');
        setLoading(true);

        try {
            const { error: oauthError } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback?redirect=/dashboard`,
                },
            });

            if (oauthError) throw oauthError;
        } catch (err: unknown) {
            setError(getAuthErrorMessage(err, 'Failed to sign up with Google'));
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            footer={
                <p className="mt-6 text-center text-xs text-text-muted">
                    By creating an account, you agree to our Terms of Service and Privacy Policy.
                </p>
            }
        >
            <GlassCard>
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2">Create Account</h1>
                    <p className="text-text-secondary">Start practicing with AI today</p>
                </div>

                <AuthAlert error={error} />

                <GoogleAuthButton onClick={handleGoogleSignup} loading={loading} />

                <AuthDivider label="Or sign up with email" />

                <form onSubmit={handleEmailSignup} className="space-y-4">
                    <AuthInput
                        id="fullName"
                        label="Full Name"
                        icon={User}
                        type="text"
                        value={fullName}
                        onChange={(e) => {
                            setFullName(e.target.value);
                            clearFieldError('fullName');
                        }}
                        required
                        placeholder="John Doe"
                        error={fieldErrors.fullName}
                    />

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

                    <PasswordFields
                        password={password}
                        confirmPassword={confirmPassword}
                        onPasswordChange={setPassword}
                        onConfirmPasswordChange={setConfirmPassword}
                        fieldErrors={fieldErrors}
                        onClearFieldError={clearFieldError}
                    />

                    <GradientButton type="submit" loading={loading} loadingLabel="Creating account...">
                        Create Account
                    </GradientButton>
                </form>

                <p className="mt-6 text-center text-sm text-text-secondary">
                    Already have an account?{' '}
                    <Link href="/login" className="text-orange-400 hover:text-orange-300 font-medium transition-colors">
                        Sign in
                    </Link>
                </p>
            </GlassCard>
        </AuthLayout>
    );
}
