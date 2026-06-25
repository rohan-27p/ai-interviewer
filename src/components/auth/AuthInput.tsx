import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    icon: LucideIcon;
    error?: string;
    labelExtra?: React.ReactNode;
}

export function AuthInput({
    label,
    icon: Icon,
    error,
    labelExtra,
    className,
    ...props
}: AuthInputProps) {
    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <label htmlFor={props.id} className="block text-sm font-medium text-muted-foreground">
                    {label}
                </label>
                {labelExtra}
            </div>
            <div className="relative">
                <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    {...props}
                    className={cn(
                        'w-full pl-10 pr-4 py-2.5 bg-background border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all',
                        error ? 'border-destructive' : 'border-border',
                        className
                    )}
                />
            </div>
            {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
        </div>
    );
}
