import { NextResponse } from 'next/server';
import { createClient as createDeepgramClient } from '@deepgram/sdk';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { getSttLanguage } from '@/lib/stt';

export async function GET(req: Request) {
    try {
        const supabase = await createSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const rate = checkRateLimit(`stt-token:${user.id}`, 20, 60_000);
        if (!rate.allowed) {
            return rateLimitResponse(rate.retryAfterMs ?? 60_000);
        }

        const apiKey = process.env.DEEPGRAM_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'STT not configured' }, { status: 503 });
        }

        const { searchParams } = new URL(req.url);
        const voiceId = searchParams.get('voiceId') || 'en-US-matthew';
        const language = getSttLanguage(voiceId);

        const deepgram = createDeepgramClient(apiKey);

        try {
            const { result: projectsResult } = await deepgram.manage.getProjects();
            const projectId = projectsResult?.projects?.[0]?.project_id;

            if (projectId) {
                const { result: keyResult, error: keyError } = await deepgram.manage.createProjectKey(
                    projectId,
                    {
                        comment: `interview-stt-${user.id.slice(0, 8)}`,
                        scopes: ['usage:write'],
                        time_to_live_in_seconds: 120,
                    }
                );

                if (!keyError && keyResult?.key) {
                    return NextResponse.json({
                        token: keyResult.key,
                        language,
                        expiresIn: 120,
                    });
                }
            }
        } catch {
            // Fall back to main API key when ephemeral key creation fails
        }

        return NextResponse.json({ token: apiKey, language, expiresIn: 300 });
    } catch (error) {
        console.error('STT token error:', error);
        return NextResponse.json({ error: 'Failed to create STT token' }, { status: 500 });
    }
}
