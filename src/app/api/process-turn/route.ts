import { NextResponse } from 'next/server';
import { createClient } from '@deepgram/sdk';
import { Groq } from 'groq-sdk';
import { Message, Question } from '@/lib/types';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';

// Initialize Clients
const deepgram = createClient(process.env.DEEPGRAM_API_KEY ?? '');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Constants
const MURF_API_KEY = process.env.MURF_API_KEY;

// Keywords that indicate user wants to move to next question
const NEXT_QUESTION_TRIGGERS = [
    'next question',
    'move on',
    'next problem',
    'different question',
    'another question',
    'skip',
    'done with this',
    'let\'s move on',
    'i\'m done',
    'finished'
];

export async function POST(req: Request) {
    try {
        const supabase = await createSupabaseClient();

        // Authenticate user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await req.formData();
        const audioFile = formData.get('audio') as Blob;
        const sessionId = formData.get('sessionId') as string;

        if (!audioFile) {
            return NextResponse.json({ error: 'Missing audio' }, { status: 400 });
        }

        // FIX #3: Fetch state from DATABASE, not client
        if (!sessionId) {
            return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
        }

        const { data: session, error: sessionError } = await supabase
            .from('interview_sessions')
            .select('*')
            .eq('id', sessionId)
            .eq('user_id', user.id)
            .single();

        if (sessionError || !session) {
            console.error('Session fetch error:', sessionError);
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        // Get state from DATABASE (source of truth)
        const conversationHistory: Message[] = session.messages || [];
        const currentQuestionIndex = session.current_question_index || 0;
        const maxQuestions = session.num_questions;
        const code = formData.get('code') as string || '';
        const currentQuestionTitle = formData.get('currentQuestionTitle') as string || '';
        const previousQuestionsStr = formData.get('previousQuestions') as string || '[]';
        const previousQuestions: string[] = JSON.parse(previousQuestionsStr);

        // HARD STOP: Enforce question limit at backend
        const isFinalQuestion = currentQuestionIndex >= maxQuestions - 1;
        const hasReachedLimit = currentQuestionIndex >= maxQuestions;

        if (hasReachedLimit) {
            return NextResponse.json({
                error: 'Interview complete',
                shouldEndInterview: true
            }, { status: 400 });
        }

        // ------------------------------------------------------------------
        // 1. STT: Deepgram SDK (Nova-2)
        // ------------------------------------------------------------------
        const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

        const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
            audioBuffer,
            {
                model: 'nova-2',
                smart_format: true,
                language: 'en-US',
            }
        );

        if (error) {
            console.error('Deepgram Error:', error);
            throw new Error(`Deepgram STT failed: ${error.message}`);
        }

        const userTranscript = result?.results?.channels[0]?.alternatives[0]?.transcript;

        if (!userTranscript) {
            return NextResponse.json({ error: 'No speech detected' }, { status: 400 });
        }

        console.log('User said:', userTranscript);

        // ------------------------------------------------------------------
        // 2. LLM: Groq (Llama 3.3) with STRUCTURED OUTPUT
        // ------------------------------------------------------------------

        // FIX #1: Separate system context from user message
        const systemPrompt = `You are an expert technical interviewer conducting a ${session.interview_type} interview.

Current Code State:
\`\`\`
${code}
\`\`\`

Interview Rules:
- This is question ${currentQuestionIndex + 1} of ${maxQuestions}
${isFinalQuestion ? '- THIS IS THE FINAL QUESTION. After evaluation, the interview ends.' : ''}
- Be encouraging and helpful but CONCISE
- Keep responses under 3-4 sentences unless explaining complex concepts
- Ask focused follow-up questions to understand thought process
- Guide them if stuck, but don't give away the answer

RESPONSE STYLE:
- Be conversational and natural, like a real interviewer
- Avoid repeating what the candidate just said
- Ask ONE follow-up question at a time, not multiple
- Keep it brief - you're having a conversation, not writing an essay

IMPORTANT: At the end of your response, add a status tag:
- If the candidate has fully solved the current problem AND you believe they're ready to move on, end with: [STATUS:COMPLETE]
- Otherwise, end with: [STATUS:CONTINUE]

Only use [STATUS:COMPLETE] when:
1. The candidate provided a correct, working solution
2. You've evaluated their approach and it's solid
3. They've answered your follow-up questions satisfactorily`;

        const messages = [
            { role: 'system', content: systemPrompt },
            ...conversationHistory,
            { role: 'user', content: userTranscript }
        ];

        const completion = await groq.chat.completions.create({
            messages: messages as any[],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.6,
            max_tokens: 150, // Reduced from 300 for conciseness
        });

        const aiReply = completion.choices[0]?.message?.content || "I didn't catch that.";
        console.log('AI replied:', aiReply);

        // FIX #2: Parse structured status tag instead of text matching
        const statusMatch = aiReply.match(/\[STATUS:(COMPLETE|CONTINUE)\]/);
        const aiStatus = statusMatch ? statusMatch[1] : 'CONTINUE';

        // Remove status tag from user-visible reply
        const cleanReply = aiReply.replace(/\[STATUS:(COMPLETE|CONTINUE)\]/, '').trim();

        console.log('AI Status:', aiStatus);

        // ------------------------------------------------------------------
        // 3. PLANNED ARCHITECTURE: Fetch next question from DATABASE
        // ------------------------------------------------------------------
        let newQuestion: Question | null = null;

        // Check if user explicitly requested next question
        const lowerTranscript = userTranscript.toLowerCase();
        const userRequestedNext = NEXT_QUESTION_TRIGGERS.some(trigger =>
            lowerTranscript.includes(trigger)
        );

        const shouldAdvance = (userRequestedNext || aiStatus === 'COMPLETE') && !isFinalQuestion && !hasReachedLimit;

        if (shouldAdvance) {
            console.log('Advancing to next question...');

            // Mark current question as completed in DB
            const { data: currentQ } = await supabase
                .from('interview_questions')
                .select('id')
                .eq('session_id', sessionId)
                .eq('status', 'active')
                .single();

            if (currentQ) {
                await supabase
                    .from('interview_questions')
                    .update({
                        status: 'completed',
                        completed_at: new Date().toISOString(),
                        user_answer: conversationHistory.map((m: Message) => m.content).join('\n')
                    })
                    .eq('id', currentQ.id);
            }

            // Fetch next pending question from DB
            const { data: nextQ, error: nextError } = await supabase
                .from('interview_questions')
                .select('*')
                .eq('session_id', sessionId)
                .eq('status', 'pending')
                .order('question_order', { ascending: true })
                .limit(1)
                .single();

            if (nextQ && !nextError) {
                // Activate next question
                await supabase
                    .from('interview_questions')
                    .update({
                        status: 'active',
                        asked_at: new Date().toISOString()
                    })
                    .eq('id', nextQ.id);

                // Map to frontend format
                newQuestion = {
                    title: nextQ.question_title,
                    description: nextQ.question_description,
                    difficulty: nextQ.question_difficulty,
                    constraints: nextQ.constraints || [],
                    examples: nextQ.examples || []
                };

                console.log('✅ Next question activated:', newQuestion.title);
            } else {
                console.log('No more questions in database');
            }

        } else if (isFinalQuestion && (userRequestedNext || aiStatus === 'COMPLETE')) {
            // User finished final question - mark as completed
            console.log('Final question complete. Marking as completed...');

            const { data: finalQ } = await supabase
                .from('interview_questions')
                .select('id')
                .eq('session_id', sessionId)
                .eq('status', 'active')
                .single();

            if (finalQ) {
                await supabase
                    .from('interview_questions')
                    .update({
                        status: 'completed',
                        completed_at: new Date().toISOString(),
                        user_answer: conversationHistory.map((m: Message) => m.content).join('\n')
                    })
                    .eq('id', finalQ.id);
            }

            console.log('Signaling interview end.');
        }

        // ------------------------------------------------------------------
        // 4. TTS: Murf AI (Falcon Model)
        // ------------------------------------------------------------------
        const murfUrl = 'https://global.api.murf.ai/v1/speech/stream';
        const murfPayload = {
            voiceId: 'en-US-matthew',
            text: cleanReply,
            multiNativeLocale: 'en-US',
            model: 'FALCON',
            format: 'MP3',
            sampleRate: 24000,
            channelType: 'MONO'
        };

        const murfResponse = await fetch(murfUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': MURF_API_KEY!
            },
            body: JSON.stringify(murfPayload)
        });

        if (!murfResponse.ok) {
            const errText = await murfResponse.text();
            console.error('Murf Falcon Error:', errText);
            throw new Error(`Murf TTS failed: ${errText}`);
        }

        const audioArrayBuffer = await murfResponse.arrayBuffer();
        const audioBase64 = Buffer.from(audioArrayBuffer).toString('base64');

        // Update session in database with new messages
        const updatedMessages = [
            ...conversationHistory,
            { role: 'user', content: userTranscript },
            { role: 'assistant', content: cleanReply }
        ];

        await supabase
            .from('interview_sessions')
            .update({
                messages: updatedMessages,
                current_question_index: newQuestion ? currentQuestionIndex + 1 : currentQuestionIndex
            })
            .eq('id', sessionId)
            .eq('user_id', user.id);

        return NextResponse.json({
            transcript: userTranscript,
            reply: cleanReply,
            audioBase64: audioBase64,
            newQuestion: newQuestion,
            shouldEndInterview: isFinalQuestion && (userRequestedNext || aiStatus === 'COMPLETE')
        });

    } catch (error) {
        console.error('Processing Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}