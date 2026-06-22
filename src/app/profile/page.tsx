'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Award,
    Calendar,
    CheckCircle2,
    Flame,
    Loader2,
    Mail,
    Shield,
    Sparkles,
    Target,
    TrendingUp,
    Trophy,
    User,
    Zap,
} from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { createClient } from '@/lib/supabase/client';
import { getAuthErrorMessage } from '@/lib/auth/errors';

interface UserStats {
    total_interviews: number;
    average_score: number;
    total_sessions: number;
    completed_sessions: number;
    total_questions_attempted: number;
    questions_completed: number;
}

interface SessionRow {
    interview_type: string;
    status: string;
    started_at: string;
}

interface ProfileRow {
    full_name: string | null;
    avatar_url: string | null;
    created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
    DSA: 'DSA',
    Frontend: 'Frontend',
    Backend: 'Backend',
    Fullstack: 'Fullstack',
    Cybersecurity: 'Security',
    DevOps: 'DevOps',
};

const ACHIEVEMENTS = [
    { id: 'first', label: 'First Steps', desc: 'Complete 1 interview', min: 1, icon: Sparkles },
    { id: 'regular', label: 'Regular', desc: 'Complete 5 interviews', min: 5, icon: Target },
    { id: 'dedicated', label: 'Dedicated', desc: 'Complete 10 interviews', min: 10, icon: Trophy },
    { id: 'sharp', label: 'Sharp Mind', desc: 'Average score 8+', scoreMin: 8, icon: Zap },
    { id: 'closer', label: 'Question Closer', desc: '50 questions completed', questionsMin: 50, icon: CheckCircle2 },
];

function computeStreak(dates: string[]): number {
    if (dates.length === 0) return 0;

    const uniqueDays = [...new Set(dates.map((d) => d.slice(0, 10)))].sort();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = 0;
    const check = new Date(today);

    for (let i = 0; i < 365; i++) {
        const key = check.toISOString().slice(0, 10);
        if (uniqueDays.includes(key)) {
            streak += 1;
            check.setDate(check.getDate() - 1);
        } else if (streak === 0 && i === 0) {
            check.setDate(check.getDate() - 1);
            continue;
        } else {
            break;
        }
    }

    return streak;
}

function computeLevel(completed: number): { level: number; label: string; progress: number } {
    const thresholds = [0, 3, 8, 15, 25, 40];
    let level = 1;
    for (let i = thresholds.length - 1; i >= 0; i--) {
        if (completed >= thresholds[i]) {
            level = i + 1;
            break;
        }
    }
    const next = thresholds[level] ?? thresholds[thresholds.length - 1] + 10;
    const prev = thresholds[level - 1] ?? 0;
    const progress = Math.min(100, Math.round(((completed - prev) / (next - prev)) * 100));

    const labels = ['Rookie', 'Practitioner', 'Specialist', 'Expert', 'Master', 'Legend'];
    return { level, label: labels[level - 1] ?? 'Legend', progress };
}

export default function ProfilePage() {
    const router = useRouter();
    const supabase = createClient();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [email, setEmail] = useState('');
    const [memberSince, setMemberSince] = useState('');
    const [fullName, setFullName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [stats, setStats] = useState<UserStats | null>(null);
    const [sessions, setSessions] = useState<SessionRow[]>([]);
    const [practiceGoal, setPracticeGoal] = useState(3);

    const loadProfile = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login?redirect=/profile');
                return;
            }

            setEmail(user.email ?? '');
            setMemberSince(user.created_at);

            const savedGoal = localStorage.getItem(`practice_goal_${user.id}`);
            if (savedGoal) setPracticeGoal(Number(savedGoal));

            const { data: profile } = await supabase
                .from('user_profiles')
                .select('full_name, avatar_url, created_at')
                .eq('id', user.id)
                .single();

            if (profile) {
                setFullName(profile.full_name ?? '');
                setAvatarUrl(profile.avatar_url ?? '');
            }

            const { data: statsData } = await supabase
                .from('user_statistics')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (statsData) setStats(statsData as UserStats);

            const { data: sessionData } = await supabase
                .from('interview_sessions')
                .select('interview_type, status, started_at')
                .eq('user_id', user.id)
                .order('started_at', { ascending: false });

            setSessions(sessionData ?? []);
        } catch (err) {
            setError(getAuthErrorMessage(err, 'Failed to load profile.'));
        } finally {
            setLoading(false);
        }
    }, [router, supabase]);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    const streak = useMemo(
        () => computeStreak(sessions.map((s) => s.started_at)),
        [sessions]
    );

    const levelInfo = useMemo(
        () => computeLevel(stats?.completed_sessions ?? 0),
        [stats?.completed_sessions]
    );

    const typeBreakdown = useMemo(() => {
        const counts: Record<string, number> = {};
        sessions.forEach((s) => {
            const key = s.interview_type || 'Other';
            counts[key] = (counts[key] || 0) + 1;
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]);
    }, [sessions]);

    const maxTypeCount = typeBreakdown[0]?.[1] ?? 1;

    const earnedAchievements = ACHIEVEMENTS.filter((a) => {
        if (a.min) return (stats?.completed_sessions ?? 0) >= a.min;
        if (a.scoreMin) return (stats?.average_score ?? 0) >= a.scoreMin;
        if (a.questionsMin) return (stats?.questions_completed ?? 0) >= a.questionsMin;
        return false;
    });

    const weeklyProgress = Math.min(
        100,
        Math.round(((stats?.completed_sessions ?? 0) / practiceGoal) * 100)
    );

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error: updateError } = await supabase
                .from('user_profiles')
                .update({
                    full_name: fullName.trim(),
                    avatar_url: avatarUrl.trim() || null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);

            if (updateError) throw updateError;

            localStorage.setItem(`practice_goal_${user.id}`, String(practiceGoal));
            setSuccess('Profile updated successfully.');
        } catch (err) {
            setError(getAuthErrorMessage(err, 'Failed to update profile.'));
        } finally {
            setSaving(false);
        }
    };

    const initials = (fullName || email || 'U')
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-white">
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" />
                <div
                    className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"
                    style={{ animationDelay: '1s' }}
                />
            </div>

            <AppHeader profileName={fullName} avatarUrl={avatarUrl || null} />

            <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
                        {success}
                    </div>
                )}

                {/* Hero card */}
                <section className="p-6 sm:p-8 bg-gradient-to-br from-orange-500/10 via-transparent to-purple-500/10 border border-white/10 rounded-2xl">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                        <div className="relative">
                            <div
                                className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-500 to-purple-600 blur-md opacity-40"
                                style={{ transform: 'scale(1.1)' }}
                            />
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt={fullName}
                                    className="relative w-24 h-24 rounded-full object-cover border-2 border-orange-500/50"
                                />
                            ) : (
                                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center text-2xl font-bold border-2 border-white/20">
                                    {initials}
                                </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-full border border-[#0a0a0b]">
                                Lv {levelInfo.level}
                            </div>
                        </div>

                        <div className="flex-1 text-center sm:text-left">
                            <h1 className="text-3xl font-bold mb-1">{fullName || 'Your Profile'}</h1>
                            <p className="text-[#a0a0a5] mb-4">{levelInfo.label} interviewer</p>
                            <div className="flex flex-wrap justify-center sm:justify-start gap-3">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-sm">
                                    <Flame className="w-4 h-4 text-orange-400" />
                                    {streak} day streak
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-sm">
                                    <Trophy className="w-4 h-4 text-yellow-400" />
                                    {stats?.completed_sessions ?? 0} completed
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-sm">
                                    <TrendingUp className="w-4 h-4 text-blue-400" />
                                    {Number(stats?.average_score ?? 0).toFixed(1)}/10 avg
                                </span>
                            </div>
                            <div className="mt-4">
                                <div className="flex justify-between text-xs text-[#a0a0a5] mb-1">
                                    <span>Progress to next level</span>
                                    <span>{levelInfo.progress}%</span>
                                </div>
                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-orange-500 to-purple-500 rounded-full transition-all"
                                        style={{ width: `${levelInfo.progress}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Edit profile */}
                    <section className="lg:col-span-2 p-6 bg-white/5 border border-white/10 rounded-2xl">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <User className="w-5 h-5 text-orange-400" />
                            Profile Settings
                        </h2>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm text-[#a0a0a5] mb-2">Full name</label>
                                <input
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20"
                                    placeholder="Your name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-[#a0a0a5] mb-2">Avatar URL</label>
                                <input
                                    value={avatarUrl}
                                    onChange={(e) => setAvatarUrl(e.target.value)}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20"
                                    placeholder="https://..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-[#a0a0a5] mb-2 flex items-center gap-2">
                                    <Mail className="w-4 h-4" /> Email (read-only)
                                </label>
                                <input
                                    value={email}
                                    disabled
                                    className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-[#a0a0a5] cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-[#a0a0a5] mb-2 flex items-center gap-2">
                                    <Target className="w-4 h-4" /> Weekly practice goal (sessions)
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={14}
                                    value={practiceGoal}
                                    onChange={(e) => setPracticeGoal(Number(e.target.value))}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-orange-500/50"
                                />
                                <p className="mt-2 text-xs text-[#6b6b70]">
                                    This week: {stats?.completed_sessions ?? 0} / {practiceGoal} ({weeklyProgress}%)
                                </p>
                            </div>
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save changes'}
                            </button>
                        </form>
                    </section>

                    {/* Account & security */}
                    <section className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Shield className="w-5 h-5 text-purple-400" />
                            Account
                        </h2>
                        <div className="flex items-center gap-3 text-sm text-[#a0a0a5]">
                            <Calendar className="w-4 h-4 shrink-0" />
                            Member since {new Date(memberSince).toLocaleDateString()}
                        </div>
                        <Link
                            href="/forgot-password"
                            className="block text-sm text-orange-400 hover:text-orange-300 transition-colors"
                        >
                            Change password →
                        </Link>
                        <Link
                            href="/verify-email"
                            className="block text-sm text-[#a0a0a5] hover:text-white transition-colors"
                        >
                            Email verification →
                        </Link>
                    </section>
                </div>

                {/* Type breakdown */}
                <section className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                    <h2 className="text-xl font-bold mb-6">Interview focus areas</h2>
                    {typeBreakdown.length === 0 ? (
                        <p className="text-[#a0a0a5] text-sm">No interviews yet. Start one from the dashboard.</p>
                    ) : (
                        <div className="space-y-4">
                            {typeBreakdown.map(([type, count]) => (
                                <div key={type}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>{TYPE_LABELS[type] || type}</span>
                                        <span className="text-[#a0a0a5]">{count} sessions</span>
                                    </div>
                                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full"
                                            style={{ width: `${(count / maxTypeCount) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Achievements */}
                <section className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Award className="w-5 h-5 text-yellow-400" />
                        Achievements
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {ACHIEVEMENTS.map((achievement) => {
                            const earned = earnedAchievements.some((e) => e.id === achievement.id);
                            const Icon = achievement.icon;
                            return (
                                <div
                                    key={achievement.id}
                                    className={`p-4 rounded-xl border transition-all ${
                                        earned
                                            ? 'bg-orange-500/10 border-orange-500/30'
                                            : 'bg-white/[0.02] border-white/10 opacity-60'
                                    }`}
                                >
                                    <Icon
                                        className={`w-6 h-6 mb-2 ${earned ? 'text-orange-400' : 'text-[#6b6b70]'}`}
                                    />
                                    <p className="font-semibold">{achievement.label}</p>
                                    <p className="text-xs text-[#a0a0a5] mt-1">{achievement.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </main>
        </div>
    );
}
