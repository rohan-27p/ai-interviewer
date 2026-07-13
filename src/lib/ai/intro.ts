import { Question } from '@/lib/types';
import { synthesizeSpeech } from '@/lib/ai/tts';
import { getGroqClient } from '@/lib/ai/groq';

function getIntroPrompt(interviewType: string, isFirstQuestion: boolean): string {
    const subsequentPrompt = `You are continuing a technical interview. Generate a BRIEF transition to the next question.
Keep it under 2 sentences. Do NOT say "Hello", "Hi", "Welcome", or any greeting - you're already mid-interview.
Just say something like "Great, let's move on to..." or "Now let's discuss..." then the topic.
Do NOT repeat what they answered before.`;

    if (!isFirstQuestion) {
        return subsequentPrompt;
    }

    const prompts: Record<string, string> = {
        dsa: `You are a friendly technical interviewer. Generate a brief introduction for a coding interview question. 
Keep it under 3 sentences. Be warm but professional.
Include: A brief greeting, the problem name, a one-line summary, and ask them to share their approach.
Do NOT include full problem details - they can read those themselves.`,

        frontend: `You are a friendly frontend development interviewer. Generate a brief introduction for a technical discussion.
Keep it under 3 sentences. Be conversational and encouraging.
Mention the topic, give context on what you want to discuss, and invite them to share their experience.`,

        backend: `You are a friendly backend development interviewer. Generate a brief introduction for a technical discussion.
Keep it under 3 sentences. Be professional and encouraging.
Mention the topic and invite them to share their knowledge and experience.`,

        fullstack: `You are a friendly fullstack development interviewer. Generate a brief introduction for a technical discussion.
Keep it under 3 sentences. Be conversational.
Mention the topic and set the stage for discussing both frontend and backend aspects.`,

        cybersecurity: `You are a friendly cybersecurity interviewer. Generate a brief introduction for a security-focused discussion.
Keep it under 3 sentences. Be professional.
Mention the topic and invite them to share their security knowledge and experience.`,

        devops: `You are a friendly DevOps interviewer. Generate a brief introduction for a technical discussion.
Keep it under 3 sentences. Be encouraging.
Mention the topic and invite them to share their experience with infrastructure and operations.`,
    };

    return prompts[interviewType.toLowerCase()] || prompts.dsa;
}

export interface IntroResult {
    introText: string;
    audioBase64: string | null;
    timing?: { llm: number; tts: number; total: number };
}

export async function generateIntro(
    question: Question,
    interviewType: string,
    isFirstQuestion: boolean,
    voiceId = 'en-US-matthew'
): Promise<IntroResult> {
    const totalStart = Date.now();
    const normalizedType = interviewType.toLowerCase();

    const llmStart = Date.now();
    let introText = '';

    try {
        const groq = getGroqClient();
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: getIntroPrompt(normalizedType, isFirstQuestion),
                },
                {
                    role: 'user',
                    content: isFirstQuestion
                        ? `Generate an intro for this ${normalizedType === 'dsa' ? 'question' : 'topic'}:
Title: ${question.title}
Description: ${question.description}`
                        : `Generate a brief transition to this next ${normalizedType === 'dsa' ? 'question' : 'topic'}:
Title: ${question.title}
Description: ${question.description}`,
                },
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.7,
            max_tokens: 150,
        });

        introText = completion.choices[0]?.message?.content || '';
    } catch {
        introText = '';
    }

    const llmTime = Date.now() - llmStart;

    if (!introText || introText.length < 10) {
        introText =
            normalizedType === 'dsa'
                ? `Hi! Today's problem is "${question.title}". Take a moment to read it, and when you're ready, walk me through your approach.`
                : `Hi! Let's discuss "${question.title}". I'd love to hear your thoughts and experience on this topic.`;
    }

    const ttsStart = Date.now();
    const audioBase64 = await synthesizeSpeech(introText, voiceId);
    const ttsTime = Date.now() - ttsStart;

    return {
        introText,
        audioBase64,
        timing: { llm: llmTime, tts: ttsTime, total: Date.now() - totalStart },
    };
}
