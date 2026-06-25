import Link from 'next/link';
import { formatInterviewTypeDisplay } from '@/lib/interview-types';
import { cn } from '@/lib/utils';

interface SessionCardProps {
    session: {
        id: string;
        interview_type: string;
        difficulty: string;
        status: string;
        started_at: string;
    };
}

const statusClasses: Record<string, string> = {
    active: 'bg-accent/10 text-accent border-accent/20',
    completed: 'bg-success/10 text-success border-success/20',
    abandoned: 'bg-destructive/10 text-destructive border-destructive/20',
};

export function SessionCard({ session }: SessionCardProps) {
    const href =
        session.status === 'completed'
            ? `/feedback/${session.id}`
            : session.status === 'active'
              ? `/interview/${session.id}`
              : `/instructions/${session.id}`;

    return (
        <Link
            href={href}
            className="block p-5 bg-white border border-border rounded-lg shadow-sm hover:border-primary/40 hover:shadow-md transition-all"
        >
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="font-medium text-base mb-1">
                        {formatInterviewTypeDisplay(session.interview_type)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {session.difficulty} · {new Date(session.started_at).toLocaleDateString()}
                    </p>
                </div>
                <span
                    className={cn(
                        'px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize shrink-0',
                        statusClasses[session.status] || statusClasses.active
                    )}
                >
                    {session.status}
                </span>
            </div>
        </Link>
    );
}
