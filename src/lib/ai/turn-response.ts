export type InterviewTurnStatus = 'COMPLETE' | 'CONTINUE';

export interface StructuredTurnResponse {
    reply: string;
    status: InterviewTurnStatus;
}

const FALLBACK_REPLY = 'Could you share a little more detail about your approach?';

function parseJsonResponse(raw: string): StructuredTurnResponse | null {
    const candidate = raw
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();

    try {
        const parsed = JSON.parse(candidate) as Partial<StructuredTurnResponse>;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

        const reply = typeof parsed.reply === 'string' ? parsed.reply.trim() : '';
        const status = parsed.status === 'COMPLETE' ? 'COMPLETE' : 'CONTINUE';

        return { reply: reply || FALLBACK_REPLY, status };
    } catch {
        return null;
    }
}

export function parseStructuredTurnResponse(raw: string): StructuredTurnResponse {
    const jsonResponse = parseJsonResponse(raw);
    if (jsonResponse) return jsonResponse;

    const statusMatch = raw.match(/\[STATUS:\s*(COMPLETE|CONTINUE)\]/);
    const aiStatus = statusMatch?.[1] === 'COMPLETE' ? 'COMPLETE' : 'CONTINUE';
    const cleanReply = raw.replace(/\[STATUS:\s*(COMPLETE|CONTINUE)\]/, '').trim();

    return {
        reply: cleanReply || raw.trim(),
        status: aiStatus,
    };
}
