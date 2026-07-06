'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Calendar,
    Flame,
    Mail,
    Target,
    TrendingUp,
    Trophy,
} from 'lucide-react';
import { INTERVIEW_TYPE_LABELS } from '@/lib/interview-types';
import { PageLoader } from '@/components/ui/PageLoader';
import { Button } from '@/components/ui/Button';
import { AlertBanner } from '@/components/ui/AlertBanner';
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

const TYPE_LABELS = INTERVIEW_TYPE_LABELS;

const ACHIEVEMENTS = [
    { id: 'first', label: 'First Steps', desc: 'Complete 1 interview', min: 1 },
    { id: 'regular', label: 'Regular', desc: 'Complete 5 interviews', min: 5 },
    { id: 'dedicated', label: 'Dedicated', desc: 'Complete 10 interviews', min: 10 },
    { id: 'sharp', label: 'Sharp Mind', desc: 'Average score 8+', scoreMin: 8 },
    { id: 'closer', label: 'Question Closer', desc: '50 questions completed', questionsMin: 50 },
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
        return <PageLoader />;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
                {error && <AlertBanner variant="error">{error}</AlertBanner>}
                {success && <AlertBanner variant="success">{success}</AlertBanner>}

                <section className="p-6 sm:p-8 bg-card border border-border rounded-lg">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt={fullName} className="w-20 h-20 rounded-full object-cover border border-border" />
                        ) : (
                            <div className="w-20 h-20 rounded-full bg-secondary border border-border flex items-center justify-center text-xl font-medium">
                                {initials}
                            </div>
                        )}
                        <div className="flex-1 text-center sm:text-left">
                            <h1 className="text-2xl font-semibold tracking-tight mb-1">{fullName || 'Your profile'}</h1>
                            <p className="text-muted-foreground mb-4">{levelInfo.label} · Level {levelInfo.level}</p>
                            <div className="flex flex-wrap justify-center sm:justify-start gap-3 text-sm">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border rounded-md">
                                    <Flame className="w-4 h-4 text-muted-foreground" />
                                    {streak} day streak
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border rounded-md">
                                    <Trophy className="w-4 h-4 text-muted-foreground" />
                                    {stats?.completed_sessions ?? 0} completed
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border rounded-md">
                                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                                    {Number(stats?.average_score ?? 0).toFixed(1)}/10 avg
                                </span>
                            </div>
                            <div className="mt-4">
                                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                    <span>Progress to next level</span>
                                    <span>{levelInfo.progress}%</span>
                                </div>
                                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                                    <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${levelInfo.progress}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <section className="lg:col-span-2 p-6 bg-card border border-border rounded-lg">
                        <h2 className="text-lg font-medium mb-6">Profile settings</h2>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm text-muted-foreground mb-2">Full name</label>
                                <input
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                    placeholder="Your name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-muted-foreground mb-2">Avatar URL</label>
                                <input
                                    value={avatarUrl}
                                    onChange={(e) => setAvatarUrl(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                    placeholder="https://..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-muted-foreground mb-2 flex items-center gap-2">
                                    <Mail className="w-4 h-4" /> Email (read-only)
                                </label>
                                <input value={email} disabled className="w-full px-4 py-2.5 bg-secondary border border-border rounded-md text-muted-foreground cursor-not-allowed" />
                            </div>
                            <div>
                                <label className="block text-sm text-muted-foreground mb-2 flex items-center gap-2">
                                    <Target className="w-4 h-4" /> Weekly practice goal (sessions)
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={14}
                                    value={practiceGoal}
                                    onChange={(e) => setPracticeGoal(Number(e.target.value))}
                                    className="w-full px-4 py-2.5 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                                <p className="mt-2 text-xs text-muted-foreground">
                                    This week: {stats?.completed_sessions ?? 0} / {practiceGoal} ({weeklyProgress}%)
                                </p>
                            </div>
                            <Button type="submit" variant="primary" className="w-full" loading={saving} loadingLabel="Saving...">
                                Save changes
                            </Button>
                        </form>
                    </section>

                    <section className="p-6 bg-card border border-border rounded-lg space-y-4">
                        <h2 className="text-lg font-medium">Account</h2>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4 shrink-0" />
                            Member since {new Date(memberSince).toLocaleDateString()}
                        </div>
                        <Link href="/forgot-password" className="block text-sm text-accent hover:underline">
                            Change password
                        </Link>
                        <Link href="/verify-email" className="block text-sm text-muted-foreground hover:text-foreground">
                            Email verification
                        </Link>
                    </section>
                </div>

                <section className="p-6 bg-card border border-border rounded-lg">
                    <h2 className="text-lg font-medium mb-6">Interview focus areas</h2>
                    {typeBreakdown.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No interviews yet. Start one from the dashboard.</p>
                    ) : (
                        <div className="space-y-4">
                            {typeBreakdown.map(([type, count]) => (
                                <div key={type}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>{TYPE_LABELS[type] || type}</span>
                                        <span className="text-muted-foreground">{count} sessions</span>
                                    </div>
                                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                                        <div className="h-full bg-accent rounded-full" style={{ width: `${(count / maxTypeCount) * 100}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className="p-6 bg-card border border-border rounded-lg">
                    <h2 className="text-lg font-medium mb-6">Achievements</h2>
                    <div className="space-y-2">
                        {ACHIEVEMENTS.map((achievement) => {
                            const earned = earnedAchievements.some((e) => e.id === achievement.id);
                            return (
                                <div
                                    key={achievement.id}
                                    className={`flex items-center gap-3 p-3 rounded-md border ${
                                        earned ? 'border-accent/30 bg-accent/5' : 'border-border opacity-60'
                                    }`}
                                >
                                    <div className={`w-2 h-2 rounded-full ${earned ? 'bg-accent' : 'bg-muted'}`} />
                                    <div>
                                        <p className="text-sm font-medium">{achievement.label}</p>
                                        <p className="text-xs text-muted-foreground">{achievement.desc}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
        </div>
    );
}
