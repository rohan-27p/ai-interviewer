'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mic, Loader2, Mail, Lock, Chrome } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getAuthErrorMessage, isEmailNotConfirmed } from '@/lib/auth/errors';
import { validateEmail, validatePassword } from '@/lib/auth/validation';

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get('redirect') || '/dashboard';
    const passwordResetSuccess = searchParams.get('reset') === 'success';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

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
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback?redirect=${redirectTo}`,
                },
            });

            if (error) throw error;
        } catch (err: unknown) {
            setError(getAuthErrorMessage(err, 'Failed to sign in with Google'));
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-white overflow-hidden flex items-center justify-center">
            {/* Animated Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            {/* Logo - Top Left */}
            <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 z-20">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                    <Mic className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">InterviewAI</span>
            </Link>

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-md px-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
                        <p className="text-[#a0a0a5]">Sign in to continue your practice</p>
                    </div>

                    {/* Error / success messages */}
                    {passwordResetSuccess && (
                        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
                            Your password has been updated. Sign in with your new password.
                        </div>
                    )}

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Google Sign In */}
                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl transition-all mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <Chrome className="w-5 h-5" />
                                <span className="font-medium">Continue with Google</span>
                            </>
                        )}
                    </button>

                    {/* Divider */}
                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-[#0a0a0b] text-[#6b6b70]">Or continue with email</span>
                        </div>
                    </div>

                    {/* Email/Password Form */}
                    <form onSubmit={handleEmailLogin} className="space-y-4">
                        {/* Email Input */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium mb-2 text-[#a0a0a5]">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6b6b70]" />
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        setFieldErrors((prev) => ({ ...prev, email: undefined }));
                                    }}
                                    required
                                    placeholder="you@example.com"
                                    className={`w-full pl-11 pr-4 py-3 bg-white/5 border rounded-xl text-white placeholder-[#6b6b70] focus:outline-none focus:ring-2 transition-all ${
                                        fieldErrors.email
                                            ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20'
                                            : 'border-white/10 focus:border-orange-500/50 focus:ring-orange-500/20'
                                    }`}
                                />
                            </div>
                            {fieldErrors.email && (
                                <p className="mt-2 text-sm text-red-400">{fieldErrors.email}</p>
                            )}
                        </div>

                        {/* Password Input */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label htmlFor="password" className="block text-sm font-medium text-[#a0a0a5]">
                                    Password
                                </label>
                                <Link
                                    href="/forgot-password"
                                    className="text-sm text-orange-400 hover:text-orange-300 transition-colors"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6b6b70]" />
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setFieldErrors((prev) => ({ ...prev, password: undefined }));
                                    }}
                                    required
                                    placeholder="••••••••"
                                    className={`w-full pl-11 pr-4 py-3 bg-white/5 border rounded-xl text-white placeholder-[#6b6b70] focus:outline-none focus:ring-2 transition-all ${
                                        fieldErrors.password
                                            ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20'
                                            : 'border-white/10 focus:border-orange-500/50 focus:ring-orange-500/20'
                                    }`}
                                />
                            </div>
                            {fieldErrors.password && (
                                <p className="mt-2 text-sm text-red-400">{fieldErrors.password}</p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 rounded-xl font-semibold transition-all shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    {/* Sign Up Link */}
                    <p className="mt-6 text-center text-sm text-[#a0a0a5]">
                        Don&apos;t have an account?{' '}
                        <Link href="/signup" className="text-orange-400 hover:text-orange-300 font-medium transition-colors">
                            Sign up
                        </Link>
                    </p>
                </div>

                {/* Additional Info */}
                <p className="mt-6 text-center text-xs text-[#6b6b70]">
                    By signing in, you agree to practice responsibly and learn effectively.
                </p>
            </div>
        </div>
    );
}
