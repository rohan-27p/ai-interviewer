import { NextResponse } from 'next/server';
import { createClient } from '@deepgram/sdk';
import { Groq } from 'groq-sdk';
import { Message, Question } from '@/lib/types';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { generateIntro } from '@/lib/ai/intro';
import { getCachedSpeech } from '@/lib/ai/tts';
import { parseStructuredTurnResponse } from '@/lib/ai/turn-response';
import { getSttLanguage } from '@/lib/stt';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export const maxDuration = 120;

// Initialize Clients
const deepgram = createClient(process.env.DEEPGRAM_API_KEY ?? '');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const MAX_TEXT_RESPONSE_LENGTH = 10_000;
const MAX_CODE_LENGTH = 50_000;

export async function POST(req: Request) {
    const totalStart = Date.now();

    try {
        const supabase = await createSupabaseClient();

        //Authenticate user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const rate = checkRateLimit(`turn:${user.id}`, 40, 60_000);
        if (!rate.allowed) {
            return rateLimitResponse(rate.retryAfterMs ?? 60_000);
        }

        const formData = await req.formData();
        const audioFile = formData.get('audio') as Blob | null;
        const sessionId = formData.get('sessionId') as string;
        const textResponse = (formData.get('textResponse') as string | null)?.trim() || '';

        if (!textResponse && !audioFile) {
            return NextResponse.json({ error: 'Missing audio or text response' }, { status: 400 });
        }

        if (textResponse.length > MAX_TEXT_RESPONSE_LENGTH) {
            return NextResponse.json({ error: 'Text response is too long' }, { status: 413 });
        }

        if (audioFile && audioFile.size > MAX_AUDIO_BYTES) {
            return NextResponse.json({ error: 'Audio recording must be 10 MB or smaller' }, { status: 413 });
        }

        //Fetch state from DATABASE, not client
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

        // SECURITY: Reject if session is not active (source of truth)
        if (session.status !== 'active') {
            console.log(`❌ Rejected process-turn: session ${sessionId} is ${session.status}`);
            return NextResponse.json({
                error: 'Interview is no longer active',
                shouldEndInterview: true,
                redirectTo: session.status === 'completed' ? `/feedback/${sessionId}` : '/dashboard'
            }, { status: 403 });
        }

        // Get state from DATABASE (source of truth)
        const conversationHistory: Message[] = (session.messages as Message[] | null) ?? [];
        const maxQuestions = session.num_questions;
        const code = formData.get('code') as string || '';

        if (code.length > MAX_CODE_LENGTH) {
            return NextResponse.json({ error: 'Code submission is too long' }, { status: 413 });
        }

        //Check question status from DB instead of index
        const { data: activeQuestion } = await supabase
            .from('interview_questions')
            .select('question_order, question_title')
            .eq('session_id', sessionId)
            .eq('status', 'active')
            .single();

        const currentQuestionTitle = activeQuestion?.question_title || '';
        const currentQuestionIndex = activeQuestion ? activeQuestion.question_order - 1 : 0;

        if (code) {
            await supabase
                .from('interview_questions')
                .update({ user_code: code })
                .eq('session_id', sessionId)
                .eq('status', 'active');
        }

        //Check if there are any questions left
        const { count } = await supabase
            .from('interview_questions')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', sessionId)
            .in('status', ['active', 'pending']);

        const questionsRemaining = count || 0;
        const isFinalQuestion = questionsRemaining === 1;
        const hasReachedLimit = questionsRemaining === 0;

        if (hasReachedLimit) {
            console.log('No more questions - interview complete');
            return NextResponse.json({
                error: 'Interview complete',
                shouldEndInterview: true
            }, { status: 200 }); // Changed to 200, not an error
        }

        // STT: Deepgram (skip when text response provided)
        let userTranscript = textResponse;
        let sttTime = 0;

        if (!userTranscript) {
            if (!audioFile) {
                return NextResponse.json({ error: 'Missing audio or text response' }, { status: 400 });
            }
            const sttStart = Date.now();
            const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
            const voiceId = session.voice_id || 'en-US-matthew';

            const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
                audioBuffer,
                {
                    model: 'nova-2',
                    smart_format: true,
                    language: getSttLanguage(voiceId),
                }
            );

            if (error) {
                logger.error('deepgram_stt_failed', { sessionId, message: error.message });
                return NextResponse.json({
                    error: 'Speech recognition failed. Try typing your response instead.',
                    allowTextFallback: true,
                }, { status: 422 });
            }

            userTranscript = result?.results?.channels[0]?.alternatives[0]?.transcript || '';
            sttTime = Date.now() - sttStart;
            logger.info('stt_complete', { sessionId, ms: sttTime });
        }

        if (!userTranscript) {
            return NextResponse.json({
                error: 'No speech detected. Try speaking again or type your answer.',
                allowTextFallback: true,
            }, { status: 400 });
        }

        //LLM: Groq (Llama 3.3) with STRUCTURED OUTPUT
        const { data: dbQuestion } = await supabase
            .from('interview_questions')
            .select('question_title, question_description, question_type, question_difficulty, followup_count')
            .eq('session_id', sessionId)
            .eq('status', 'active')
            .single();

        const actualQuestionTitle = dbQuestion?.question_title || currentQuestionTitle;
        const actualQuestionDescription = dbQuestion?.question_description || '';
        const actualQuestionType = dbQuestion?.question_type || session.interview_type;
        const actualDifficulty = dbQuestion?.question_difficulty || 'Medium';
        const currentFollowupCount = dbQuestion?.followup_count || 0;

        // DIFFICULTY-BASED FOLLOW-UP LIMITS
        const followupLimits: Record<string, number> = {
            'Easy': 1,
            'Medium': 2,
            'Hard': 3
        };
        const maxFollowups = followupLimits[actualDifficulty] || 2;
        const followupsRemaining = maxFollowups - currentFollowupCount;

        const systemPrompt = `You are an expert technical interviewer conducting a ${actualQuestionType.toUpperCase()} interview.

=== CRITICAL: STAY ON THIS EXACT QUESTION ===
QUESTION TITLE: "${actualQuestionTitle}"
QUESTION DESCRIPTION: ${actualQuestionDescription}
DIFFICULTY: ${actualDifficulty}

THIS IS THE ONLY QUESTION YOU ARE EVALUATING. DO NOT:
- Ask about other topics or programming languages
- Generate new coding problems  
- Deviate from the question above
- Ask DSA questions if this is a Backend/Frontend/etc interview

YOUR ONLY JOB:
1. Evaluate the candidate's answer to THE QUESTION ABOVE
2. Ask clarifying follow-ups ABOUT THE QUESTION ABOVE
3. Correct errors in their explanation or code
4. Guide them if stuck with hints RELATED TO THE QUESTION ABOVE

=== FOLLOW-UP RULES (${actualDifficulty} DIFFICULTY) ===
- Maximum follow-ups for this question: ${maxFollowups}
- Follow-ups asked so far: ${currentFollowupCount}
- Follow-ups remaining: ${followupsRemaining}

${followupsRemaining > 0 ? `
YOU MUST ASK ${followupsRemaining} MORE FOLLOW-UP(S) before marking complete:
- If user's answer is incomplete, ask for clarification
- If user's code has bugs, point them out and ask to fix
- If user's explanation is wrong, correct them and ask follow-up
- Ask about edge cases, complexity, or alternative approaches
- Each follow-up must be BASED ON what the user said/wrote
` : `
ALL FOLLOW-UPS EXHAUSTED. You must now:
- Give brief final evaluation of their answer
- Mark [STATUS:COMPLETE] to move to next question
- Do NOT ask more questions about this topic
`}

Current Code State:
\`\`\`
${code}
\`\`\`

Interview Progress:
- This is question ${currentQuestionIndex + 1} of ${maxQuestions}
${isFinalQuestion ? '- THIS IS THE FINAL QUESTION. After evaluation, interview ends.' : ''}

RESPONSE STYLE:
- Be encouraging, conversational, and CONCISE (2-3 sentences max)
- Ask ONE focused follow-up at a time about THE QUESTION ABOVE
- If candidate is off-topic, gently redirect: "Let's focus on ${actualQuestionTitle}..."
- Don't repeat what they just said
- Correct errors constructively: "I noticed X, can you fix that?"

OUTPUT FORMAT (REQUIRED — valid JSON only, no markdown):
{"reply":"your spoken response to the candidate","status":"CONTINUE"}
Use status "COMPLETE" only when follow-ups are exhausted and the question is fully answered.
Use status "CONTINUE" while follow-ups remain or the answer is incomplete.

REMEMBER: You are ONLY evaluating "${actualQuestionTitle}" with exactly ${maxFollowups} follow-ups!`;

        const messages = [
            { role: 'system', content: systemPrompt },
            ...conversationHistory,
            { role: 'user', content: userTranscript }
        ];

        const llmStart = Date.now();
        let aiReply = "I didn't catch that. Could you repeat that?";
        let aiStatus: 'COMPLETE' | 'CONTINUE' = 'CONTINUE';
        let llmTime = 0;

        try {
            const completion = await groq.chat.completions.create({
                messages: messages as Message[],
                model: 'llama-3.3-70b-versatile',
                temperature: 0.6,
                max_tokens: 180,
                response_format: { type: 'json_object' },
            });
            llmTime = Date.now() - llmStart;
            const rawReply = completion.choices[0]?.message?.content || aiReply;
            const structured = parseStructuredTurnResponse(rawReply);
            aiReply = structured.reply;
            aiStatus = structured.status;
        } catch (llmError) {
            logger.error('llm_failed', { sessionId, error: String(llmError) });
            return NextResponse.json({
                error: 'AI is temporarily unavailable. Please try again in a moment.',
                allowTextFallback: true,
            }, { status: 503 });
        }

        console.log(`⏱️ LLM: ${llmTime}ms`);
        logger.info('llm_complete', { sessionId, ms: llmTime });

        const cleanReply = aiReply;

        // INCREMENT FOLLOW-UP COUNT when AI continues discussion
        if (aiStatus === 'CONTINUE' && dbQuestion) {
            const newFollowupCount = currentFollowupCount + 1;
            await supabase
                .from('interview_questions')
                .update({ followup_count: newFollowupCount })
                .eq('session_id', sessionId)
                .eq('status', 'active');

            logger.info('followup_count_updated', { sessionId, count: newFollowupCount, max: maxFollowups });
        }

        //fetch next question from DB
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
                    examples: (nextQ.examples as unknown as Question['examples']) ?? [],
                };

                console.log('✅ Next question activated:', newQuestion.title);

                const voiceId = session.voice_id || 'en-US-matthew';
                const intro = await generateIntro(newQuestion, session.interview_type, false, voiceId);

                const earlyMessages = [
                    ...conversationHistory,
                    { role: 'user', content: userTranscript },
                    { role: 'assistant', content: intro.introText },
                ];

                await supabase
                    .from('interview_sessions')
                    .update({
                        messages: earlyMessages,
                        current_question_index: currentQuestionIndex + 1,
                    })
                    .eq('id', sessionId)
                    .eq('user_id', user.id);

                return NextResponse.json({
                    transcript: userTranscript,
                    reply: intro.introText,
                    audioBase64: intro.audioBase64,
                    streamTts: !intro.audioBase64,
                    newQuestion,
                    shouldEndInterview: false,
                    timing: { stt: sttTime, total: Date.now() - totalStart },
                });
            } else {
                console.log('No more questions in database');
            }

        } else if (isFinalQuestion && (userRequestedNext || aiStatus === 'COMPLETE')) {
            //User finished final question - mark as completed
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

        const ttsStart = Date.now();
        const voiceId = session.voice_id || 'en-US-matthew';
        const cachedAudio = getCachedSpeech(cleanReply, voiceId);
        const audioBase64 = cachedAudio;
        const streamTts = !cachedAudio;
        const ttsTime = Date.now() - ttsStart;

        if (!audioBase64) {
            logger.warn('tts_fallback_text_only', { sessionId });
        } else {
            logger.info('tts_complete', { sessionId, ms: ttsTime });
        }

        const totalTime = Date.now() - totalStart;
        logger.info('turn_complete', { sessionId, ms: totalTime, stt: sttTime, llm: llmTime, tts: ttsTime });

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
            audioBase64,
            streamTts,
            newQuestion: newQuestion,
            shouldEndInterview: isFinalQuestion && (userRequestedNext || aiStatus === 'COMPLETE')
        });

    } catch (error) {
        console.error('Processing Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
