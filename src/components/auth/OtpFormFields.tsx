import React from 'react';
import { Mail, KeyRound } from 'lucide-react';
import { AuthInput } from './AuthInput';

interface OtpFormFieldsProps {
    email: string;
    code: string;
    onEmailChange: (value: string) => void;
    onCodeChange: (value: string) => void;
    fieldErrors: { email?: string; code?: string };
    onClearFieldError: (field: 'email' | 'code') => void;
    codeLabel?: string;
    codePlaceholder?: string;
}

export function OtpFormFields({
    email,
    code,
    onEmailChange,
    onCodeChange,
    fieldErrors,
    onClearFieldError,
    codeLabel = 'Verification Code',
    codePlaceholder = '123456',
}: OtpFormFieldsProps) {
    return (
        <>
            <AuthInput
                id="email"
                label="Email"
                icon={Mail}
                type="email"
                value={email}
                onChange={(e) => {
                    onEmailChange(e.target.value);
                    onClearFieldError('email');
                }}
                required
                placeholder="you@example.com"
                error={fieldErrors.email}
            />

            <AuthInput
                id="code"
                label={codeLabel}
                icon={KeyRound}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                value={code}
                onChange={(e) => {
                    onCodeChange(e.target.value.replace(/\D/g, ''));
                    onClearFieldError('code');
                }}
                required
                placeholder={codePlaceholder}
                error={fieldErrors.code}
                className="tracking-widest"
            />
        </>
    );
}
