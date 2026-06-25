import Link from 'next/link';
import { formatInterviewTypeDisplay } from '@/lib/interview-types';
import { getVerdictColor } from '@/lib/feedback-utils';

interface FeedbackCardProps {
    feedback: {
        id: string;
        overall_score: number;
        overall_verdict: string;
        created_at: string;
        session_id: string;
        interview_type?: string;
    };
}

export function FeedbackCard({ feedback }: FeedbackCardProps) {
    return (
        <Link
            href={`/feedback/${feedback.session_id}`}
            className="block p-5 bg-white border border-border rounded-lg shadow-sm hover:border-primary/40 hover:shadow-md transition-all"
        >
            <div className="flex justify-between items-start mb-2 gap-2">
                <div className="text-2xl font-semibold tracking-tight">{feedback.overall_score}/10</div>
                {feedback.interview_type && (
                    <span className="text-xs px-2 py-1 bg-secondary text-muted-foreground rounded-md border border-border">
                        {formatInterviewTypeDisplay(feedback.interview_type)}
                    </span>
                )}
            </div>
            <div className={`text-sm font-medium mb-2 ${getVerdictColor(feedback.overall_verdict || '')}`}>
                {feedback.overall_verdict || 'Pending'}
            </div>
            <div className="text-xs text-muted-foreground">
                {new Date(feedback.created_at).toLocaleDateString()}
            </div>
        </Link>
    );
}
