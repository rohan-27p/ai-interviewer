import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Create a new interview session
export async function POST(req: Request) {
    try {
        const supabase = await createClient();

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { interview_type, difficulty, topics, num_questions } = body;

        // Validate input
        if (!interview_type || !difficulty || !topics || !num_questions) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Create new session
        const { data: session, error } = await supabase
            .from('interview_sessions')
            .insert({
                user_id: user.id,
                interview_type,
                difficulty,
                topics,
                num_questions,
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

        console.log(`Session created: ${session.id}. Generating ${num_questions} questions...`);

        // ==================================================================
        // PLANNED ARCHITECTURE: Generate ALL questions upfront
        // ==================================================================

        try {
            // Call batch generation API
            const questionResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/generate-question-batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': req.headers.get('cookie') || '', // Pass auth cookies
                },
                body: JSON.stringify({
                    interviewType: interview_type,
                    difficulty,
                    topics,
                    count: num_questions
                })
            });

            if (!questionResponse.ok) {
                throw new Error('Failed to generate questions');
            }

            const { questions } = await questionResponse.json();

            console.log(`Generated ${questions.length} questions. Storing in DB...`);

            // Store each question in interview_questions table
            const questionInserts = questions.map((q: any, index: number) => ({
                session_id: session.id,
                question_title: q.title,
                question_description: q.description,
                question_difficulty: q.difficulty,
                question_type: q.type || interview_type,
                constraints: q.constraints,
                examples: q.examples,
                followup_guidelines: q.followup_guidelines,
                question_order: index + 1,
                status: index === 0 ? 'active' : 'pending', // First question is active
            }));

            const { error: insertError } = await supabase
                .from('interview_questions')
                .insert(questionInserts);

            if (insertError) {
                console.error('Error inserting questions:', insertError);
                // Don't fail - session was created successfully
                // Questions can be generated on-the-fly as fallback
            } else {
                console.log(`✅ Successfully stored ${questions.length} questions for session ${session.id}`);
            }

        } catch (questionError) {
            console.error('Question generation error:', questionError);
            // Don't fail the session creation - just log the error
            // Questions can be generated on-the-fly as fallback
        }

        return NextResponse.json({ session });
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

// Update session (messages, status, etc.)
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

        const updateData: any = {};
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
