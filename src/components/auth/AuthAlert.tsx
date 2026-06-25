import React from 'react';
import { AlertBanner } from '@/components/ui/AlertBanner';

interface AuthAlertProps {
    error?: string;
    success?: string;
}

export function AuthAlert({ error, success }: AuthAlertProps) {
    return (
        <>
            {success && (
                <AlertBanner variant="success" className="mb-6">
                    {success}
                </AlertBanner>
            )}
            {error && (
                <AlertBanner variant="error" className="mb-6">
                    {error}
                </AlertBanner>
            )}
        </>
    );
}
