import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    loadingLabel?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-primary text-primary-foreground hover:bg-blue-700 shadow-sm shadow-blue-600/20',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-slate-200',
    ghost: 'hover:bg-secondary text-foreground',
    destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
    outline: 'border border-border bg-card hover:bg-secondary text-foreground shadow-sm',
};

const sizeClasses: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
};

export function Button({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    loadingLabel = 'Loading...',
    className,
    disabled,
    ...props
}: ButtonProps) {
    return (
        <button
            {...props}
            disabled={disabled || loading}
            className={cn(
                'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed',
                variantClasses[variant],
                sizeClasses[size],
                className
            )}
        >
            {loading ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {loadingLabel}
                </>
            ) : (
                children
            )}
        </button>
    );
}

/** @deprecated Use Button with variant="primary" instead */
export function GradientButton({
    children,
    loading = false,
    loadingLabel = 'Loading...',
    className = '',
    disabled,
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; loadingLabel?: string }) {
    return (
        <Button
            variant="primary"
            size="md"
            loading={loading}
            loadingLabel={loadingLabel}
            className={cn('w-full', className)}
            disabled={disabled}
            {...props}
        >
            {children}
        </Button>
    );
}
