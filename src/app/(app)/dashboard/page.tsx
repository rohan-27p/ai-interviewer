'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trophy, Target, Clock, ArrowRight, TrendingUp, Star, Code2, Mic2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatInterviewTypeDisplay } from '@/lib/interview-types';
import { PageLoader } from '@/components/ui/PageLoader';
import { StatCard } from '@/components/dashboard/StatCard';
import { SessionCard } from '@/components/dashboard/SessionCard';
import { FeedbackCard } from '@/components/dashboard/FeedbackCard';
import { AnimatedList } from '@/components/ui/AnimatedList';
import { Button } from '@/components/ui/Button';

interface UserProfile {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    total_interviews: number;
    questions_completed: number;
    total_questions_solved: number;
    average_score: number;
    created_at: string;
}

interface InterviewSession {
    id: string;
    interview_type: string;
    difficulty: string;
    status: string;
    started_at: string;
    completed_at: string | null;
    duration_seconds: number | null;
}

interface FeedbackReport {
    id: string;
    overall_score: number;
    overall_verdict: string;
    created_at: string;
    session_id: string;
    interview_type?: string;
}

export default function DashboardPage() {
    const router = useRouter();
    const supabase = createClient();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [sessions, setSessions] = useState<InterviewSession[]>([]);
    const [feedback, setFeedback] = useState<FeedbackReport[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push('/login');
                return;
            }

            const { data: stats, error: statsError } = await supabase
                .from('user_statistics')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (statsError) {
                console.error('Error fetching stats:', statsError);
            }

            const { data: profileData } = await supabase
                .from('user_profiles')
                .select('full_name, avatar_url')
                .eq('id', user.id)
                .single();

            setProfile({
                id: user.id,
                full_name: profileData?.full_name || user.email || 'User',
                avatar_url: profileData?.avatar_url || null,
                total_interviews: stats?.total_interviews || 0,
                total_questions_solved: stats?.total_questions_attempted || 0,
                questions_completed: stats?.questions_completed || 0,
                average_score: stats?.average_score || 0,
                created_at: user.created_at,
            });

            const { data: sessionsData } = await supabase
                .from('interview_sessions')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(5);

            setSessions(sessionsData || []);

            const { data: feedbackData } = await supabase
                .from('feedback_reports')
                .select(`
                    *,
                    interview_sessions!session_id (interview_type)
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(6);

            const mappedFeedback = (feedbackData || []).map((fb: { interview_sessions?: { interview_type?: string } } & FeedbackReport) => ({
                ...fb,
                interview_type: fb.interview_sessions?.interview_type || 'Unknown',
            }));
            setFeedback(mappedFeedback);
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <PageLoader />;
    }

    const topSubject = (() => {
        const typeCounts: Record<string, number> = {};
        sessions.forEach((s) => {
            const type = s.interview_type || 'Unknown';
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });
        const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
        if (!topType) return 'None';
        return formatInterviewTypeDisplay(topType[0]);
    })();

    return (
        <div>
            <div className="mb-8 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
                <div className="grid gap-6 p-6 lg:grid-cols-[1fr_340px] lg:p-8">
                    <div>
                        <p className="text-sm font-medium text-primary">Interview command center</p>
                        <h1 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                            Welcome back, {profile?.full_name || 'there'}
                        </h1>
                        <p className="mt-2 max-w-2xl text-muted-foreground">
                            Continue your prep loop: choose a track, speak through tradeoffs, code under pressure,
                            and review scored feedback after each session.
                        </p>
                        <div className="mt-6 flex flex-col sm:flex-row gap-3">
                            <Link href="/setup">
                                <Button variant="primary" className="w-full sm:w-auto">
                                    New mock interview
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </Link>
                            <Link href="/feedback">
                                <Button variant="outline" className="w-full sm:w-auto">
                                    Review feedback
                                </Button>
                            </Link>
                        </div>
                    </div>
                    <div className="rounded-lg border border-border bg-slate-950 p-4 text-slate-100">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <span className="font-mono text-xs text-slate-300">prep-plan.json</span>
                            <span className="text-xs text-emerald-300">active</span>
                        </div>
                        <div className="mt-4 space-y-3 text-sm">
                            <div className="flex items-center gap-3">
                                <Code2 className="h-4 w-4 text-blue-300" />
                                <span>DSA question queue ready</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Mic2 className="h-4 w-4 text-emerald-300" />
                                <span>Voice interviewer enabled</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                <div className="h-full w-2/3 rounded-full bg-primary" />
                            </div>
                            <p className="text-xs text-slate-400">Focus area: {topSubject}</p>
                        </div>
                    </div>
                </div>
            </div>

            <AnimatedList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                <StatCard
                    icon={<Trophy className="w-5 h-5" />}
                    label="Total Interviews"
                    value={profile?.total_interviews || 0}
                    highlight
                />
                <StatCard
                    icon={<Target className="w-5 h-5" />}
                    label="Questions Completed"
                    value={`${profile?.questions_completed ?? 0}/${profile?.total_questions_solved ?? 0}`}
                />
                <StatCard
                    icon={<TrendingUp className="w-5 h-5" />}
                    label="Average Score"
                    value={`${profile?.average_score?.toFixed(1) || '0.0'}/10`}
                />
                <StatCard
                    icon={<Star className="w-5 h-5" />}
                    label="Recent Focus"
                    value={topSubject}
                />
            </AnimatedList>

            <div className="mb-10">
                <h2 className="text-lg font-semibold tracking-tight mb-4">Quick actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link
                        href="/setup"
                        className="group p-5 bg-card border border-border rounded-lg shadow-sm hover:border-primary/40 hover:shadow-md transition-all"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium mb-1">Start new interview</h3>
                                <p className="text-sm text-muted-foreground">Configure and begin a session</p>
                            </div>
                            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                        </div>
                    </Link>
                    <Link
                        href="/feedback"
                        className="group p-5 bg-card border border-border rounded-lg shadow-sm hover:border-primary/40 hover:shadow-md transition-all"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium mb-1">View feedback</h3>
                                <p className="text-sm text-muted-foreground">Review past performance</p>
                            </div>
                            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                        </div>
                    </Link>
                    <Link
                        href="/profile"
                        className="group p-5 bg-card border border-border rounded-lg shadow-sm hover:border-primary/40 hover:shadow-md transition-all"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium mb-1">Your profile</h3>
                                <p className="text-sm text-muted-foreground">Stats and account settings</p>
                            </div>
                            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                        </div>
                    </Link>
                </div>
            </div>

            <div className="mb-10">
                <h2 className="text-lg font-semibold tracking-tight mb-4">Recent sessions</h2>
                {sessions.length === 0 ? (
                    <div className="p-12 bg-card border border-border rounded-lg text-center shadow-sm">
                        <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground mb-4">No interviews yet</p>
                        <Link href="/setup">
                            <Button variant="primary" className="inline-flex items-center gap-2">
                                Start your first interview
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <AnimatedList className="space-y-3">
                        {sessions.map((session) => (
                            <SessionCard key={session.id} session={session} />
                        ))}
                    </AnimatedList>
                )}
            </div>

            {feedback.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold tracking-tight mb-4">Recent feedback</h2>
                    <AnimatedList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {feedback.map((fb) => (
                            <FeedbackCard key={fb.id} feedback={fb} />
                        ))}
                    </AnimatedList>
                </div>
            )}
        </div>
    );
}
