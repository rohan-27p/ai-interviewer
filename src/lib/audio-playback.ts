'use client';

export async function playStreamingMp3(
    audioElement: HTMLAudioElement,
    fetchStream: () => Promise<Response>,
    onEnded: () => void
): Promise<void> {
    if (typeof MediaSource === 'undefined') {
        const response = await fetchStream();
        const buffer = await response.arrayBuffer();
        const blob = new Blob([buffer], { type: 'audio/mpeg' });
        audioElement.src = URL.createObjectURL(blob);
        audioElement.onended = onEnded;
        await audioElement.play();
        return;
    }

    const mediaSource = new MediaSource();
    audioElement.src = URL.createObjectURL(mediaSource);
    audioElement.onended = onEnded;

    await new Promise<void>((resolve, reject) => {
        mediaSource.addEventListener(
            'sourceopen',
            async () => {
                try {
                    const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
                    const response = await fetchStream();
                    const reader = response.body?.getReader();
                    if (!reader) throw new Error('No stream body');

                    const append = (chunk: Uint8Array) =>
                        new Promise<void>((res, rej) => {
                            const onUpdate = () => {
                                sourceBuffer.removeEventListener('updateend', onUpdate);
                                res();
                            };
                            sourceBuffer.addEventListener('updateend', onUpdate);
                            try {
                                const copy = new Uint8Array(chunk.byteLength);
                                copy.set(chunk);
                                sourceBuffer.appendBuffer(copy);
                            } catch (err) {
                                rej(err);
                            }
                        });

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        if (value?.byteLength) {
                            await append(value);
                        }
                    }

                    if (mediaSource.readyState === 'open') {
                        mediaSource.endOfStream();
                    }

                    await audioElement.play();
                    resolve();
                } catch (error) {
                    reject(error);
                }
            },
            { once: true }
        );
    });
}
