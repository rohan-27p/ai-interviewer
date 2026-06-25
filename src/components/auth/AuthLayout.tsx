import React from 'react';
import { Logo } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';

interface AuthLayoutProps {
    children: React.ReactNode;
    footer?: React.ReactNode;
    centered?: boolean;
}

export function AuthLayout({ children, footer, centered = true }: AuthLayoutProps) {
    return (
        <div
            className={`min-h-screen bg-background text-foreground flex flex-col ${centered ? 'items-center justify-center' : ''} py-12 px-4`}
        >
            <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-20">
                <Logo href="/" />
                <ThemeToggle />
            </div>

            <div className="relative z-10 w-full max-w-md">
                {children}
                {footer}
            </div>
        </div>
    );
}
