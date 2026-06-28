'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trophy, Target, Clock, TrendingUp, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatInterviewTypeDisplay } from '@/lib/interview-types';
import { getVerdictColor, getScoreColor } from '@/lib/feedback-utils';
import { PageLoader } from '@/components/ui/PageLoader';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/dashboard/StatCard';

interface FeedbackReport {
    id: string;
    session_id: string;
    overall_score: number;
    overall_verdict: string;
    summary: string;
    created_at: string;
    interview_type?: string;
    difficulty?: string;
    interview_sessions?: {
        interview_type: string;
        difficulty: string;
    } | null;
}

export default function FeedbackListPage() {
    const router = useRouter();
    const supabase = createClient();

    const [feedbackList, setFeedbackList] = useState<FeedbackReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadFeedback();
    }, []);

    const loadFeedback = async () => {
        setError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push('/login');
                return;
            }

            const { data: feedbackData, error: fetchError } = await supabase
                .from('feedback_reports')
                .select(`
                    *,
                    interview_sessions!session_id (interview_type, difficulty)
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (fetchError) {
                throw new Error(`Failed to load feedback: ${fetchError.message}`);
            }

            const mapped = feedbackData.map((fb: FeedbackReport) => ({
                ...fb,
                interview_type: fb.interview_sessions?.interview_type,
                difficulty: fb.interview_sessions?.difficulty,
            }));
            setFeedbackList(mapped);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load feedback data';
            console.error('Error loading feedback:', err);
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return <PageLoader />;
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <AlertBanner variant="error" className="max-w-md text-center">{error}</AlertBanner>
                <Button variant="primary" onClick={() => { setLoading(true); loadFeedback(); }}>
                    Try again
                </Button>
            </div>
        );
    }

    const avgScore =
        feedbackList.length > 0
            ? (feedbackList.reduce((acc, fb) => acc + (fb.overall_score || 0), 0) / feedbackList.length).toFixed(1)
            : '0.0';

    const hireCount = feedbackList.filter(
        (fb) => fb.overall_verdict?.includes('Hire') && !fb.overall_verdict?.includes('No')
    ).length;

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl font-semibold tracking-tight mb-2">Feedback history</h1>
                <p className="text-muted-foreground">Review performance from past interviews</p>
            </div>

            {feedbackList.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <StatCard icon={<Trophy className="w-5 h-5" />} label="Total interviews" value={feedbackList.length} highlight />
                    <StatCard icon={<Target className="w-5 h-5" />} label="Average score" value={avgScore} />
                    <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Hire decisions" value={hireCount} />
                </div>
            )}

            {feedbackList.length === 0 ? (
                <div className="text-center py-16 bg-card border border-border rounded-lg">
                    <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                    <h2 className="text-lg font-medium mb-2">No feedback yet</h2>
                    <p className="text-muted-foreground mb-6">Complete an interview to receive detailed feedback</p>
                    <Link href="/setup">
                        <Button variant="primary">Start interview</Button>
                    </Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {feedbackList.map((fb) => (
                        <Link
                            key={fb.id}
                            href={`/feedback/${fb.session_id}`}
                            className="group block p-6 bg-card border border-border rounded-lg hover:border-accent/40 transition-colors"
                        >
                            <div className="flex items-start gap-6">
                                <div
                                    className={`w-14 h-14 rounded-full border-2 flex items-center justify-center shrink-0 ${getScoreColor(fb.overall_score || 0)}`}
                                >
                                    <span className="text-xl font-semibold">{fb.overall_score || 0}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className="text-xs px-2 py-1 rounded-md bg-secondary text-muted-foreground border border-border">
                                            {formatInterviewTypeDisplay(fb.interview_type || '')}
                                        </span>
                                        <span className="text-xs px-2 py-1 rounded-md bg-secondary text-muted-foreground border border-border">
                                            {fb.difficulty}
                                        </span>
                                        <span className={`text-sm font-medium ${getVerdictColor(fb.overall_verdict)}`}>
                                            {fb.overall_verdict}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                        {fb.summary}
                                    </p>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Clock className="w-3.5 h-3.5" />
                                        {formatDate(fb.created_at)}
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors self-center shrink-0" />
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
