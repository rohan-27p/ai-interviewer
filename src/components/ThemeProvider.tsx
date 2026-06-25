'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
    theme: Theme;
    resolvedTheme: 'light' | 'dark';
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'interview-theme';

function getSystemTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(resolved: 'light' | 'dark') {
    document.documentElement.setAttribute('data-theme', resolved);
}

function getStoredTheme(): Theme {
    if (typeof window === 'undefined') return 'light';

    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    return stored && ['light', 'dark', 'system'].includes(stored) ? stored : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(getStoredTheme);
    const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(getSystemTheme);

    const resolvedTheme = theme === 'system' ? systemTheme : theme;

    useEffect(() => {
        applyTheme(resolvedTheme);
        localStorage.setItem(STORAGE_KEY, theme);
    }, [resolvedTheme, theme]);

    useEffect(() => {
        if (theme !== 'system') return;

        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => setSystemTheme(getSystemTheme());

        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [theme]);

    const setTheme = (next: Theme) => setThemeState(next);

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return ctx;
}
