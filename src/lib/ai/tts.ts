const MURF_API_KEY = process.env.MURF_API_KEY;
const TTS_CACHE_MAX = 200;
const ttsCache = new Map<string, string>();

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 2): Promise<Response> {
    let lastError: Error | null = null;

    for (let i = 0; i <= maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.ok) return response;
            if (i === maxRetries) return response;
        } catch (error) {
            lastError = error as Error;
            await new Promise((r) => setTimeout(r, 500 * (i + 1)));
        }
    }

    throw lastError || new Error('TTS fetch failed after retries');
}

function cacheKey(text: string, voiceId: string): string {
    return `${voiceId}::${text.trim()}`;
}

export async function synthesizeSpeech(text: string, voiceId = 'en-US-matthew'): Promise<string | null> {
    if (!MURF_API_KEY || !text.trim()) return null;

    const key = cacheKey(text, voiceId);
    const cached = ttsCache.get(key);
    if (cached) return cached;

    const locale = voiceId.split('-').slice(0, 2).join('-');
    const murfUrl = 'https://global.api.murf.ai/v1/speech/stream';

    try {
        const murfResponse = await fetchWithRetry(murfUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': MURF_API_KEY,
            },
            body: JSON.stringify({
                voiceId,
                text,
                multiNativeLocale: locale,
                model: 'FALCON',
                format: 'MP3',
                sampleRate: 24000,
                channelType: 'MONO',
            }),
        });

        if (!murfResponse.ok) return null;

        const audioArrayBuffer = await murfResponse.arrayBuffer();
        if (audioArrayBuffer.byteLength < 1000) return null;

        const audioBase64 = Buffer.from(audioArrayBuffer).toString('base64');

        if (ttsCache.size >= TTS_CACHE_MAX) {
            const firstKey = ttsCache.keys().next().value;
            if (firstKey) ttsCache.delete(firstKey);
        }
        ttsCache.set(key, audioBase64);

        return audioBase64;
    } catch {
        return null;
    }
}
