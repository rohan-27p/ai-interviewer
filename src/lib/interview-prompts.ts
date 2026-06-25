import { Message, Question } from '@/lib/types';

export interface InterviewConfig {
    type: string;
    topics: string[];
    difficulty: string;
    questionCount: number;
    voiceId: string;
}

export function stringify(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

export function getSystemPrompt(question: Question | null, config: InterviewConfig): Message {
    const basePrompt = config.type === 'dsa'
        ? `You are an expert technical interviewer conducting a live coding interview.

CURRENT QUESTION: ${question ? question.title : 'No question loaded yet'}
${question ? `DESCRIPTION: ${question.description}` : ''}

YOUR ROLE:
- Assess the candidate's problem-solving approach and coding skills
- Be professional, encouraging, and conversational
- If the candidate is stuck, give subtle hints without revealing the answer
- Ask clarifying questions about their approach and complexity analysis
- Keep responses concise (1-2 sentences max) to maintain natural flow
- When they solve correctly, congratulate them and ask about time/space complexity
- If they say "next question", "move on", or "I'm done", acknowledge and prepare to transition`
        : `You are an expert ${config.type.toUpperCase()} technical interviewer.

CURRENT TOPIC: ${question ? question.title : 'General ${config.type} concepts'}
${question ? `FOCUS: ${question.description}` : ''}

YOUR ROLE:
- Conduct a conversational technical interview about ${config.type} development
- Ask conceptual questions, discuss best practices, and explore their experience
- For coding-related answers, you may ask them to explain code snippets verbally
- Be professional, encouraging, and maintain a natural interview flow
- Probe deeper when they give surface-level answers
- Keep responses concise (1-2 sentences max)
- If they want to move on, acknowledge and transition smoothly`;

    return {
        role: 'system',
        content: basePrompt + '\n\nIMPORTANT: Keep your responses SHORT and CONVERSATIONAL like a real interview.',
    };
}

export const DEFAULT_INTERVIEW_CONFIG: InterviewConfig = {
    type: 'dsa',
    topics: [],
    difficulty: 'medium',
    questionCount: 3,
    voiceId: 'en-US-matthew',
};
