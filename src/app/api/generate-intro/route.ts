import { NextResponse } from 'next/server';
import { Question } from '@/lib/types';
import { generateIntro } from '@/lib/ai/intro';
import { synthesizeSpeech } from '@/lib/ai/tts';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';

export const maxDuration = 60;

function getStoredIntro(messages: unknown): string | null {
    if (!Array.isArray(messages)) return null;

    for (const message of messages) {
        if (!message || typeof message !== 'object') continue;
        const entry = message as Record<string, unknown>;
        if (entry.role === 'assistant' && typeof entry.content === 'string' && entry.content.trim()) {
            return entry.content;
        }
    }

    return null;
}

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

        const body: unknown = await req.json();
        const sessionId = body && typeof body === 'object'
            ? (body as Record<string, unknown>).sessionId
            : undefined;

        if (typeof sessionId !== 'string' || !sessionId) {
            return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
        }

        const { data: session, error: sessionError } = await supabase
            .from('interview_sessions')
            .select('id, interview_type, voice_id, status, messages')
            .eq('id', sessionId)
            .eq('user_id', user.id)
            .single();

        if (sessionError || !session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        if (session.status !== 'active') {
            return NextResponse.json({ error: 'Interview is no longer active' }, { status: 409 });
        }

        const { data: activeQuestion, error: questionError } = await supabase
            .from('interview_questions')
            .select('question_title, question_description, question_difficulty, constraints, examples')
            .eq('session_id', sessionId)
            .eq('status', 'active')
            .single();

        if (questionError || !activeQuestion) {
            return NextResponse.json({ error: 'Active question not found' }, { status: 404 });
        }

        const voiceId = session.voice_id || 'en-US-matthew';
        const storedIntro = getStoredIntro(session.messages);
        if (storedIntro) {
            return NextResponse.json({
                introText: storedIntro,
                audioBase64: await synthesizeSpeech(storedIntro, voiceId),
                reused: true,
            });
        }

        const question: Question = {
            title: activeQuestion.question_title,
            description: activeQuestion.question_description,
            difficulty: activeQuestion.question_difficulty,
            constraints: activeQuestion.constraints ?? [],
            examples: (activeQuestion.examples as unknown as Question['examples']) ?? [],
        };
        const result = await generateIntro(
            question,
            session.interview_type,
            true,
            voiceId
        );

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
