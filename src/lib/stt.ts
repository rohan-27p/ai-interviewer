/** Map Murf voice IDs to Deepgram STT language codes */
export function getSttLanguage(voiceId: string): string {
    const locale = voiceId.split('-').slice(0, 2).join('-');

    const supported: Record<string, string> = {
        'en-US': 'en-US',
        'en-GB': 'en-GB',
        'en-UK': 'en-GB',
        'en-AU': 'en-AU',
        'en-IN': 'en-IN',
        'es-ES': 'es',
        'es-MX': 'es',
        'fr-FR': 'fr',
        'de-DE': 'de',
        'hi-IN': 'hi',
    };

    return supported[locale] ?? 'en-US';
}

