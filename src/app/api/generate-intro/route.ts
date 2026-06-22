import { NextResponse } from 'next/server';
import { Question } from '@/lib/types';
import { generateIntro } from '@/lib/ai/intro';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const rate = checkRateLimit(`intro:${user.id}`, 30, 60_000);
        if (!rate.allowed) {
            return rateLimitResponse(rate.retryAfterMs ?? 60_000);
        }

        const body = await req.json();
        const { question, interviewType = 'dsa', isFirstQuestion = true, voiceId = 'en-US-matthew' } = body as {
            question: Question;
            interviewType?: string;
            isFirstQuestion?: boolean;
            voiceId?: string;
        };

        if (!question) {
            return NextResponse.json({ error: 'No question provided' }, { status: 400 });
        }

        const result = await generateIntro(question, interviewType, isFirstQuestion, voiceId);

        return NextResponse.json({
            introText: result.introText,
            audioBase64: result.audioBase64,
            timing: result.timing,
        });
    } catch (error) {
        console.error('Intro Generation Error:', error);
        return NextResponse.json({
            introText: "Hi! Let's get started. Tell me about your approach to this topic.",
            audioBase64: null,
        });
    }
}
