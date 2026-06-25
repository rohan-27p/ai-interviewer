import React from 'react';
import { Lock } from 'lucide-react';
import { AuthInput } from './AuthInput';

interface PasswordFieldsProps {
    password: string;
    confirmPassword?: string;
    onPasswordChange: (value: string) => void;
    onConfirmPasswordChange?: (value: string) => void;
    fieldErrors: { password?: string; confirmPassword?: string };
    onClearFieldError: (field: 'password' | 'confirmPassword') => void;
    passwordLabel?: string;
    confirmLabel?: string;
    passwordPlaceholder?: string;
    showConfirm?: boolean;
}

export function PasswordFields({
    password,
    confirmPassword = '',
    onPasswordChange,
    onConfirmPasswordChange,
    fieldErrors,
    onClearFieldError,
    passwordLabel = 'Password',
    confirmLabel = 'Confirm Password',
    passwordPlaceholder = 'At least 6 characters',
    showConfirm = true,
}: PasswordFieldsProps) {
    return (
        <>
            <AuthInput
                id="password"
                label={passwordLabel}
                icon={Lock}
                type="password"
                value={password}
                onChange={(e) => {
                    onPasswordChange(e.target.value);
                    onClearFieldError('password');
                }}
                required
                placeholder={passwordPlaceholder}
                error={fieldErrors.password}
            />

            {showConfirm && onConfirmPasswordChange && (
                <AuthInput
                    id="confirmPassword"
                    label={confirmLabel}
                    icon={Lock}
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                        onConfirmPasswordChange(e.target.value);
                        onClearFieldError('confirmPassword');
                    }}
                    required
                    placeholder="Re-enter your password"
                    error={fieldErrors.confirmPassword}
                />
            )}
        </>
    );
}
