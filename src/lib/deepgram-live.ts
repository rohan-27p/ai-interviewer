import { getSttLanguage } from '@/lib/stt';

export interface DeepgramLiveOptions {
    token: string;
    voiceId?: string;
    onInterim?: (transcript: string) => void;
}

export class DeepgramLiveSTT {
    private socket: WebSocket | null = null;
    private finalTranscript = '';
    private interimTranscript = '';

    start({ token, voiceId = 'en-US-matthew', onInterim }: DeepgramLiveOptions): Promise<void> {
        return new Promise((resolve, reject) => {
            const language = getSttLanguage(voiceId);
            const params = new URLSearchParams({
                model: 'nova-2',
                language,
                smart_format: 'true',
                interim_results: 'true',
                encoding: 'webm',
                sample_rate: '48000',
            });

            const socket = new WebSocket(
                `wss://api.deepgram.com/v1/listen?${params.toString()}`,
                ['token', token]
            );

            this.socket = socket;

            socket.onopen = () => resolve();
            socket.onerror = () => reject(new Error('Deepgram live connection failed'));

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data as string);
                    const alt = data.channel?.alternatives?.[0];
                    const text = alt?.transcript?.trim();
                    if (!text) return;

                    if (data.is_final) {
                        this.finalTranscript = `${this.finalTranscript} ${text}`.trim();
                        this.interimTranscript = '';
                    } else {
                        this.interimTranscript = text;
                    }

                    onInterim?.(
                        `${this.finalTranscript} ${this.interimTranscript}`.trim()
                    );
                } catch {
                    // ignore malformed frames
                }
            };
        });
    }

    sendAudioChunk(chunk: Blob) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(chunk);
        }
    }

    stop(): Promise<string> {
        return new Promise((resolve) => {
            const socket = this.socket;
            if (!socket || socket.readyState !== WebSocket.OPEN) {
                resolve(this.finalTranscript.trim());
                this.reset();
                return;
            }

            socket.onclose = () => {
                resolve(this.finalTranscript.trim());
                this.reset();
            };

            socket.close();
        });
    }

    private reset() {
        this.socket = null;
        this.finalTranscript = '';
        this.interimTranscript = '';
    }
}
