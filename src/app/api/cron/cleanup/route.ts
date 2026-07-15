import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

/**
 * Cron-triggered cleanup for stale active sessions.
 * Set CRON_SECRET in env and call with: Authorization: Bearer <CRON_SECRET>
 * Vercel cron: /api/cron/cleanup
 */
export async function GET(req: Request) {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get('authorization');

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
        return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: oldSessions, error } = await supabase
        .from('interview_sessions')
        .select('id')
        .eq('status', 'active')
        .lt('updated_at', oneHourAgo);

    if (error) {
        return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }

    if (!oldSessions?.length) {
        return NextResponse.json({ message: 'No sessions to cleanup', count: 0 });
    }

    const sessionIds = oldSessions.map((s) => s.id);

    const { error: updateError } = await supabase
        .from('interview_sessions')
        .update({
            status: 'abandoned',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .in('id', sessionIds);

    if (updateError) {
        return NextResponse.json({ error: 'Failed to update sessions' }, { status: 500 });
    }

    return NextResponse.json({
        message: `Cleaned up ${oldSessions.length} sessions.`,
        count: oldSessions.length,
    });
}
