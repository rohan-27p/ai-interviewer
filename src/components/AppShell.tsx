'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
    LayoutDashboard,
    PlusCircle,
    MessageSquareText,
    User,
    LogOut,
    Menu,
    X,
    Activity,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Logo } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/setup', label: 'New Interview', icon: PlusCircle },
    { href: '/feedback', label: 'Feedback', icon: MessageSquareText },
    { href: '/profile', label: 'Profile', icon: User },
];

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const reduceMotion = useReducedMotion();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [profileName, setProfileName] = useState<string | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    useEffect(() => {
        const loadProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from('user_profiles')
                .select('full_name, avatar_url')
                .eq('id', user.id)
                .single();

            setProfileName(data?.full_name || user.email || 'User');
            setAvatarUrl(data?.avatar_url || null);
        };

        loadProfile();
    }, [supabase]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
    };

    const displayName = profileName?.trim() || 'User';
    const initials = displayName
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    const navContent = (
        <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return (
                    <Link
                        key={href}
                        href={href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors border border-transparent',
                            active
                                ? 'border-white/10 bg-white/10 text-white'
                                : 'text-slate-300 hover:text-white hover:bg-white/5'
                        )}
                    >
                        <Icon className="w-4 h-4 shrink-0" />
                        {label}
                    </Link>
                );
            })}
        </nav>
    );

    const profileFooter = (
        <div className="border-t border-sidebar-border pt-4 space-y-2 text-sidebar-foreground">
            <Link
                href="/profile"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-sidebar-accent transition-colors"
            >
                {avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-8 h-8 rounded-md object-cover border border-white/10"
                    />
                ) : (
                    <div className="w-8 h-8 rounded-md bg-white/10 border border-white/10 flex items-center justify-center text-xs font-medium text-white">
                        {initials}
                    </div>
                )}
                <span className="text-sm truncate">{displayName}</span>
            </Link>
            <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
            >
                <LogOut className="w-4 h-4" />
                Log out
            </button>
        </div>
    );

    return (
        <div className="min-h-screen interview-surface text-foreground flex">
            {/* Desktop sidebar */}
            <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar fixed inset-y-0 left-0 z-30">
                <div className="p-6 border-b border-sidebar-border">
                    <Logo href="/dashboard" className="text-white" />
                    <div className="mt-5 rounded-md border border-white/10 bg-white/[0.06] p-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-emerald-300">
                            <Activity className="h-3.5 w-3.5" />
                            Interview OS
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-300">
                            Coding drills, voice answers, and feedback in one workspace.
                        </p>
                    </div>
                </div>
                <div className="flex-1 p-4 overflow-y-auto">{navContent}</div>
                <div className="p-4">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <span className="text-xs text-slate-400 uppercase tracking-wider">Theme</span>
                        <ThemeToggle />
                    </div>
                    {profileFooter}
                </div>
            </aside>

            {/* Mobile top bar */}
            <div className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 border-b border-border bg-background/95 backdrop-blur-sm flex items-center justify-between px-4">
                <Logo href="/dashboard" size="sm" />
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <button
                        type="button"
                        onClick={() => setMobileOpen(true)}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-border bg-card text-foreground"
                        aria-label="Open menu"
                    >
                        <Menu className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Mobile drawer */}
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: reduceMotion ? 0 : 0.2 }}
                            className="lg:hidden fixed inset-0 z-50 bg-black/40"
                            onClick={() => setMobileOpen(false)}
                        />
                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ duration: reduceMotion ? 0 : 0.25, ease: 'easeOut' }}
                            className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-sidebar-border flex flex-col"
                        >
                            <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
                                <Logo href="/dashboard" size="sm" />
                                <button
                                    type="button"
                                    onClick={() => setMobileOpen(false)}
                                    className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-border"
                                    aria-label="Close menu"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex-1 p-4 overflow-y-auto">{navContent}</div>
                            <div className="p-4">{profileFooter}</div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main content */}
            <main className="flex-1 lg:ml-60 pt-14 lg:pt-0 min-h-screen">
                {children}
            </main>
        </div>
    );
}
