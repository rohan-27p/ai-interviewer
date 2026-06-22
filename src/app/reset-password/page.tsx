'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mic, Loader2, Mail, KeyRound, Lock, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getAuthErrorMessage } from '@/lib/auth/errors';
import { resendAuthOtp } from '@/lib/auth/otp';
import { validateEmail, validatePassword, validateVerificationCode } from '@/lib/auth/validation';
import { useResendCooldown } from '@/hooks/useResendCooldown';

export default function ResetPasswordPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                </div>
            }
        >
            <ResetPasswordForm />
        </Suspense>
    );
}

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialEmail = searchParams.get('email') || '';

    const [email, setEmail] = useState(initialEmail);
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [fieldErrors, setFieldErrors] = useState<{
        email?: string;
        code?: string;
        password?: string;
        confirmPassword?: string;
    }>({});

    const { cooldown, startCooldown, isCoolingDown } = useResendCooldown();
    const supabase = createClient();

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

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

            const { error: updateError } = await supabase.auth.updateUser({
                password,
            });

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
        setError('');
        setSuccess('');

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
        <div className="min-h-screen bg-[#0a0a0b] text-white overflow-hidden flex items-center justify-center py-12">
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div
                    className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"
                    style={{ animationDelay: '1s' }}
                ></div>
            </div>

            <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 z-20">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                    <Mic className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">InterviewAI</span>
            </Link>

            <div className="relative z-10 w-full max-w-md px-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold mb-2">Reset Password</h1>
                        <p className="text-[#a0a0a5]">
                            Enter the code from your email and choose a new password
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleReset} className="space-y-4">
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

                        <div>
                            <label htmlFor="code" className="block text-sm font-medium mb-2 text-[#a0a0a5]">
                                Reset Code
                            </label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6b6b70]" />
                                <input
                                    id="code"
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    maxLength={8}
                                    value={code}
                                    onChange={(e) => {
                                        setCode(e.target.value.replace(/\D/g, ''));
                                        setFieldErrors((prev) => ({ ...prev, code: undefined }));
                                    }}
                                    required
                                    placeholder="123456"
                                    className={`w-full pl-11 pr-4 py-3 bg-white/5 border rounded-xl text-white placeholder-[#6b6b70] focus:outline-none focus:ring-2 transition-all tracking-widest ${
                                        fieldErrors.code
                                            ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20'
                                            : 'border-white/10 focus:border-orange-500/50 focus:ring-orange-500/20'
                                    }`}
                                />
                            </div>
                            {fieldErrors.code && (
                                <p className="mt-2 text-sm text-red-400">{fieldErrors.code}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium mb-2 text-[#a0a0a5]">
                                New Password
                            </label>
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
                                    placeholder="At least 6 characters"
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

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2 text-[#a0a0a5]">
                                Confirm New Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6b6b70]" />
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => {
                                        setConfirmPassword(e.target.value);
                                        setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                                    }}
                                    required
                                    placeholder="Re-enter your password"
                                    className={`w-full pl-11 pr-4 py-3 bg-white/5 border rounded-xl text-white placeholder-[#6b6b70] focus:outline-none focus:ring-2 transition-all ${
                                        fieldErrors.confirmPassword
                                            ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20'
                                            : 'border-white/10 focus:border-orange-500/50 focus:ring-orange-500/20'
                                    }`}
                                />
                            </div>
                            {fieldErrors.confirmPassword && (
                                <p className="mt-2 text-sm text-red-400">{fieldErrors.confirmPassword}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 rounded-xl font-semibold transition-all shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update Password'}
                        </button>
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
                            className="flex items-center gap-2 text-sm text-[#a0a0a5] hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to sign in
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
