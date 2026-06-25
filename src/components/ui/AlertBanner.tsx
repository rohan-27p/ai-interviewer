import React from 'react';
import { cn } from '@/lib/utils';

type AlertVariant = 'error' | 'success' | 'info';

interface AlertBannerProps {
    variant?: AlertVariant;
    children: React.ReactNode;
    className?: string;
}

const variantClasses: Record<AlertVariant, string> = {
    error: 'bg-destructive/10 border-destructive/20 text-destructive',
    success: 'bg-success/10 border-success/20 text-success',
    info: 'bg-accent/10 border-accent/20 text-accent',
};

export function AlertBanner({ variant = 'error', children, className }: AlertBannerProps) {
    return (
        <div className={cn('p-4 border rounded-lg text-sm', variantClasses[variant], className)}>
            {children}
        </div>
    );
}
