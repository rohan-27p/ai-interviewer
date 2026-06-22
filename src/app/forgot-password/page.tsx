'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mic, Loader2, Mail, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getAuthErrorMessage } from '@/lib/auth/errors';
import { requestPasswordReset } from '@/lib/auth/otp';
import { validateEmail } from '@/lib/auth/validation';

export default function ForgotPasswordPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                </div>
            }
        >
            <ForgotPasswordForm />
        </Suspense>
    );
}

function ForgotPasswordForm() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<{ email?: string }>({});

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
            const { error: resetError } = await requestPasswordReset(
                supabase,
                email,
                redirectTo
            );

            if (resetError) throw resetError;

            router.push(`/reset-password?email=${encodeURIComponent(email.trim())}`);
        } catch (err: unknown) {
            setError(getAuthErrorMessage(err, 'Failed to send reset code. Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-white overflow-hidden flex items-center justify-center">
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
                        <h1 className="text-3xl font-bold mb-2">Forgot Password</h1>
                        <p className="text-[#a0a0a5]">
                            Enter your email and we&apos;ll send you a reset code
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
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
                                        setFieldErrors({});
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

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 rounded-xl font-semibold transition-all shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Code'}
                        </button>
                    </form>

                    <div className="mt-6 flex justify-center">
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
