import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Auto-complete interviews that have been active for more than 1 hour
export async function POST(_req: Request) {
    try {
        const supabase = await createClient();

        // Get all active sessions that are older than 1 hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

        const { data: oldSessions, error } = await supabase
            .from('interview_sessions')
            .select('id')
            .eq('status', 'active')
            .lt('created_at', oneHourAgo);

        if (error) {
            console.error('Error fetching old sessions:', error);
            return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
        }

        if (!oldSessions || oldSessions.length === 0) {
            return NextResponse.json({
                message: 'No sessions to cleanup',
                count: 0
            });
        }

        // Mark all these sessions as abandoned
        const sessionIds = oldSessions.map((s: { id: string }) => s.id);

        const { error: updateError } = await supabase
            .from('interview_sessions')
            .update({
                status: 'abandoned' as const,
                completed_at: new Date().toISOString(),
            })
            .in('id', sessionIds);

        if (updateError) {
            console.error('Error updating sessions:', updateError);
            return NextResponse.json({ error: 'Failed to update sessions' }, { status: 500 });
        }

        return NextResponse.json({
            message: `Cleaned up ${oldSessions.length} sessions.`,
            count: oldSessions.length
        });

    } catch (e) {
        console.error('Cleanup error:', e);
        return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
    }
}

