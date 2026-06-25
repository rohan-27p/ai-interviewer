import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
    href?: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
};

export function Logo({ href = '/dashboard', className, size = 'md' }: LogoProps) {
    const content = (
        <span className={cn('inline-flex items-center gap-2 font-semibold tracking-tight text-foreground', sizeClasses[size], className)}>
            <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground shadow-sm">
                AI
            </span>
            <span>InterviewLab</span>
        </span>
    );

    if (href) {
        return (
            <Link href={href} className="inline-flex items-center shrink-0">
                {content}
            </Link>
        );
    }

    return content;
}
