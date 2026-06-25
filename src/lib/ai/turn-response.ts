export type InterviewTurnStatus = 'COMPLETE' | 'CONTINUE';

export interface StructuredTurnResponse {
    reply: string;
    status: InterviewTurnStatus;
}

export function parseStructuredTurnResponse(raw: string): StructuredTurnResponse {
    try {
        const parsed = JSON.parse(raw) as Partial<StructuredTurnResponse>;
        const reply = typeof parsed.reply === 'string' ? parsed.reply.trim() : '';
        const status = parsed.status === 'COMPLETE' ? 'COMPLETE' : 'CONTINUE';

        if (reply) {
            return { reply, status };
        }
    } catch {
        // fall through to legacy parsing
    }

    const statusMatch = raw.match(/\[STATUS:\s*(COMPLETE|CONTINUE)\]/);
    const aiStatus = statusMatch?.[1] === 'COMPLETE' ? 'COMPLETE' : 'CONTINUE';
    const cleanReply = raw.replace(/\[STATUS:\s*(COMPLETE|CONTINUE)\]/, '').trim();

    return {
        reply: cleanReply || raw.trim(),
        status: aiStatus,
    };
}
