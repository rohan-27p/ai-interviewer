import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { after } from 'next/server';
import type { Database, Json } from '@/lib/supabase/database.types';
import { generateQuestionBatch } from '@/app/api/generate-question-batch/route';
import { generateIntro } from '@/lib/ai/intro';
import { Question } from '@/lib/types';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';

interface GeneratedQuestionPayload {
    title: string;
    description: string;
    difficulty: string;
    type?: string;
    constraints?: string[];
    examples?: unknown[];
    followup_guidelines?: string[];
}

type SessionUpdate = Database['public']['Tables']['interview_sessions']['Update'];
type QuestionInsert = Database['public']['Tables']['interview_questions']['Insert'];

function normalizeDifficulty(value: string): 'Easy' | 'Medium' | 'Hard' {
    const lower = value.toLowerCase();
    if (lower === 'easy') return 'Easy';
    if (lower === 'hard') return 'Hard';
    return 'Medium';
}

export const maxDuration = 120;

async function persistQuestionsForSession(
    supabase: Awaited<ReturnType<typeof createClient>>,
    sessionId: string,
    interview_type: string,
    difficulty: string,
    topics: string[],
    num_questions: number,
    voice_id: string
) {
    try {
        const questions = await generateQuestionBatch({
            interviewType: interview_type,
            difficulty,
            topics,
            count: num_questions,
        });

        const questionInserts: QuestionInsert[] = questions.map((q: GeneratedQuestionPayload, index: number) => ({
            session_id: sessionId,
            question_title: q.title,
            question_description: q.description,
            question_difficulty: normalizeDifficulty(q.difficulty),
            question_type: q.type || interview_type,
            constraints: q.constraints,
            examples: q.examples as Json | undefined,
            followup_guidelines: q.followup_guidelines,
            question_order: index + 1,
            status: index === 0 ? 'active' : 'pending',
        }));

        const { error: insertError } = await supabase.from('interview_questions').insert(questionInserts);

        if (insertError) {
            console.error('Error inserting questions:', insertError);
            return;
        }

        const firstQuestion: Question = {
            title: questions[0].title,
            description: questions[0].description,
            difficulty: normalizeDifficulty(questions[0].difficulty),
            constraints: questions[0].constraints || [],
            examples: (questions[0].examples as unknown as Question['examples']) ?? [],
        };

        const intro = await generateIntro(firstQuestion, interview_type, true, voice_id);

        await supabase
            .from('interview_sessions')
            .update({
                messages: [{ role: 'assistant', content: intro.introText }],
            })
            .eq('id', sessionId);
    } catch (error) {
        console.error('Background question generation error:', error);
    }
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const rate = checkRateLimit(`sessions:${user.id}`, 10, 60_000);
        if (!rate.allowed) {
            return rateLimitResponse(rate.retryAfterMs ?? 60_000);
        }

        const body = await req.json();
        const { interview_type, difficulty, topics, num_questions, voice_id } = body;

        if (!interview_type || !difficulty || !topics || !num_questions) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const resolvedVoiceId = voice_id || 'en-US-matthew';

        const { data: session, error } = await supabase
            .from('interview_sessions')
            .insert({
                user_id: user.id,
                interview_type,
                difficulty,
                topics,
                num_questions,
                voice_id: resolvedVoiceId,
                status: 'active',
                messages: [],
                current_question_index: 0,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating session:', error);
            return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
        }

        after(() =>
            persistQuestionsForSession(
                supabase,
                session.id,
                interview_type,
                difficulty,
                topics,
                num_questions,
                resolvedVoiceId
            )
        );

        return NextResponse.json({
            session,
            questionsReady: false,
            message: 'Session created. Questions are being generated in the background.',
        });
    } catch (error) {
        console.error('Session creation error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Get session by ID
export async function GET(req: Request) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get('id');

        if (!sessionId) {
            return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
        }

        const { data: session, error } = await supabase
            .from('interview_sessions')
            .select('*')
            .eq('id', sessionId)
            .eq('user_id', user.id)
            .single();

        if (error) {
            console.error('Error fetching session:', error);
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        return NextResponse.json({ session });
    } catch (error) {
        console.error('Session fetch error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { sessionId, messages, status, currentQuestionIndex } = body;

        if (!sessionId) {
            return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
        }

        const updateData: SessionUpdate = {};
        if (messages !== undefined) updateData.messages = messages;
        if (status !== undefined) updateData.status = status;
        if (currentQuestionIndex !== undefined) updateData.current_question_index = currentQuestionIndex;

        const { data: session, error } = await supabase
            .from('interview_sessions')
            .update(updateData)
            .eq('id', sessionId)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) {
            console.error('Error updating session:', error);
            return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
        }

        return NextResponse.json({ session });
    } catch (error) {
        console.error('Session update error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
