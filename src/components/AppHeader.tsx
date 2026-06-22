'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Mic, LayoutDashboard, PlusCircle, MessageSquareText, User, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface AppHeaderProps {
    profileName?: string | null;
    avatarUrl?: string | null;
}

const NAV_ITEMS = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/setup', label: 'New Interview', icon: PlusCircle },
    { href: '/feedback', label: 'Feedback', icon: MessageSquareText },
    { href: '/profile', label: 'Profile', icon: User },
];

export function AppHeader({ profileName, avatarUrl }: AppHeaderProps) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();

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

    return (
        <nav className="relative z-20 border-b border-white/10 bg-[#0a0a0b]/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
                <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
                    <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                        <Mic className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-lg font-bold hidden sm:inline">InterviewAI</span>
                </Link>

                <div className="flex items-center gap-1 sm:gap-2">
                    {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                        const active = pathname === href || pathname.startsWith(`${href}/`);
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                    active
                                        ? 'bg-orange-500/15 text-orange-400 border border-orange-500/25'
                                        : 'text-[#a0a0a5] hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                <span className="hidden md:inline">{label}</span>
                            </Link>
                        );
                    })}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Link
                        href="/profile"
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-all"
                    >
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt={displayName}
                                className="w-8 h-8 rounded-full object-cover border border-white/10"
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center text-xs font-bold text-white">
                                {initials}
                            </div>
                        )}
                        <span className="text-sm text-[#a0a0a5] hidden lg:inline max-w-[120px] truncate">
                            {displayName}
                        </span>
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all text-sm text-[#a0a0a5] hover:text-white"
                        aria-label="Logout"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="hidden sm:inline">Logout</span>
                    </button>
                </div>
            </div>
        </nav>
    );
}
