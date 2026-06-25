'use client';

import React from 'react';
import { SunMoon } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
    className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
    const { resolvedTheme, setTheme, theme } = useTheme();

    const toggle = () => {
        if (theme === 'system') {
            setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
            return;
        }
        setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    };

    return (
        <button
            type="button"
            onClick={toggle}
            className={cn(
                'inline-flex items-center justify-center w-9 h-9 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors',
                className
            )}
            aria-label="Toggle theme"
        >
            <SunMoon className="w-4 h-4" />
        </button>
    );
}
