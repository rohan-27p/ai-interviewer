'use client';

import React, { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Clock, MessageSquare, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface PageProps {
    params: Promise<{ sessionId: string }>;
}

const INSTRUCTIONS = [
    {
        icon: Clock,
        title: '60 minute time limit',
        body: 'This session has a maximum duration of 60 minutes. The session will automatically end after this time.',
    },
    {
        icon: MessageSquare,
        title: 'Interactive interviewer',
        body: 'The interviewer will ask technical questions and follow-ups. Ask clarifying questions, think aloud, and explain your approach.',
    },
    {
        icon: AlertTriangle,
        title: 'Session rules',
        body: null,
        rules: [
            'Do not navigate away, go back, or forward during the interview',
            'Do not refresh or close the browser tab',
            'Do not open the interview in another tab or window',
            'Use the End Interview button when you are finished',
        ],
        highlight: true,
    },
    {
        icon: ShieldCheck,
        title: 'Tips',
        body: null,
        tips: [
            'Think out loud and explain your reasoning',
            'Ask questions if something is unclear',
            'Take your time — focus on approach, not just the final answer',
        ],
    },
];

export default function InterviewInstructionsPage({ params }: PageProps) {
    const { sessionId } = use(params);
    const router = useRouter();
    const [accepted, setAccepted] = useState(false);

    const handleStartInterview = () => {
        if (accepted) {
            router.push(`/interview/${sessionId}`);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-semibold tracking-tight mb-2">Before you begin</h1>
                <p className="text-muted-foreground">Read these instructions before starting your session</p>
            </div>

            <div className="space-y-4 mb-8">
                {INSTRUCTIONS.map(({ icon: Icon, title, body, rules, tips, highlight }) => (
                    <div
                        key={title}
                        className={cn(
                            'p-5 bg-card border rounded-lg flex items-start gap-4',
                            highlight ? 'border-warning/30 bg-warning/5' : 'border-border'
                        )}
                    >
                        <div className="w-9 h-9 rounded-md bg-secondary flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                            <h3 className="font-medium mb-1">{title}</h3>
                            {body && <p className="text-sm text-muted-foreground">{body}</p>}
                            {rules && (
                                <ul className="text-sm text-muted-foreground space-y-1.5 mt-2">
                                    {rules.map((rule) => (
                                        <li key={rule} className="flex items-start gap-2">
                                            <span className="w-1 h-1 rounded-full bg-muted-foreground mt-2 shrink-0" />
                                            {rule}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {tips && (
                                <ul className="text-sm text-muted-foreground space-y-1 mt-2">
                                    {tips.map((tip) => (
                                        <li key={tip}>· {tip}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <label className="flex items-center gap-3 cursor-pointer mb-6">
                <div className="relative">
                    <input
                        type="checkbox"
                        checked={accepted}
                        onChange={(e) => setAccepted(e.target.checked)}
                        className="peer sr-only"
                    />
                    <div
                        className={cn(
                            'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                            accepted ? 'bg-accent border-accent' : 'border-border'
                        )}
                    >
                        {accepted && <CheckCircle2 className="w-3.5 h-3.5 text-accent-foreground" />}
                    </div>
                </div>
                <span className="text-sm text-muted-foreground">
                    I have read and understood the instructions above
                </span>
            </label>

            <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleStartInterview}
                disabled={!accepted}
            >
                {accepted ? 'Start interview' : 'Accept instructions to continue'}
            </Button>

            <div className="text-center mt-4">
                <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
                    Cancel and return to dashboard
                </Link>
            </div>
        </div>
    );
}
