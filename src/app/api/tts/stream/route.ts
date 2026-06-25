import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { fetchSpeechStream } from '@/lib/ai/tts';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(req: Request) {
    try {
        const supabase = await createSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const rate = checkRateLimit(`tts:${user.id}`, 60, 60_000);
        if (!rate.allowed) {
            return rateLimitResponse(rate.retryAfterMs ?? 60_000);
        }

        const { text, voiceId = 'en-US-matthew' } = await req.json();

        if (!text?.trim()) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        const murfResponse = await fetchSpeechStream(text, voiceId);
        if (!murfResponse?.body) {
            return NextResponse.json({ error: 'TTS failed' }, { status: 503 });
        }

        return new NextResponse(murfResponse.body, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('TTS stream error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
