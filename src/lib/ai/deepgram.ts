import { createClient } from '@deepgram/sdk';

let client: ReturnType<typeof createClient> | undefined;

/** Create the speech-to-text provider client only when transcription is requested. */
export function getDeepgramClient(): ReturnType<typeof createClient> {
    const apiKey = process.env.DEEPGRAM_API_KEY?.trim();
    if (!apiKey) {
        throw new Error('DEEPGRAM_API_KEY is not configured');
    }

    client ??= createClient(apiKey);
    return client;
}
