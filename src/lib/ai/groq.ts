import { Groq } from 'groq-sdk';

let client: Groq | undefined;

/** Create the provider client only when an AI feature is invoked. */
export function getGroqClient(): Groq {
    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (!apiKey) {
        throw new Error('GROQ_API_KEY is not configured');
    }

    client ??= new Groq({ apiKey });
    return client;
}
