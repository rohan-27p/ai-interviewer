'use client';

import { useCallback, useState } from 'react';

export function useAuthForm<T extends Record<string, string | undefined>>() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [fieldErrors, setFieldErrors] = useState<T>({} as T);

    const clearMessages = useCallback(() => {
        setError('');
        setSuccess('');
    }, []);

    const clearFieldError = useCallback((field: keyof T) => {
        setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }, []);

    const setFieldError = useCallback((field: keyof T, message: string) => {
        setFieldErrors((prev) => ({ ...prev, [field]: message }));
    }, []);

    return {
        loading,
        setLoading,
        error,
        setError,
        success,
        setSuccess,
        fieldErrors,
        setFieldErrors,
        clearMessages,
        clearFieldError,
        setFieldError,
    };
}
