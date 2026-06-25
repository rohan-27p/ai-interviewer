import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
};

export function Card({ children, className, padding = 'md', ...props }: CardProps) {
    return (
        <div
            className={cn(
                'bg-card text-card-foreground border border-border rounded-lg shadow-sm',
                paddingClasses[padding],
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardHeader({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn('flex flex-col gap-1.5 pb-4', className)} {...props}>
            {children}
        </div>
    );
}

export function CardTitle({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h3 className={cn('text-lg font-semibold tracking-tight', className)} {...props}>
            {children}
        </h3>
    );
}

export function CardDescription({ children, className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
    return (
        <p className={cn('text-sm text-muted-foreground', className)} {...props}>
            {children}
        </p>
    );
}

export function CardContent({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn('', className)} {...props}>
            {children}
        </div>
    );
}

/** @deprecated Use Card instead */
export function GlassCard({
    children,
    className = '',
    padding = 'lg',
}: {
    children: React.ReactNode;
    className?: string;
    padding?: 'sm' | 'md' | 'lg';
}) {
    const padMap = { sm: 'sm' as const, md: 'md' as const, lg: 'lg' as const };
    return (
        <Card padding={padMap[padding]} className={className}>
            {children}
        </Card>
    );
}
