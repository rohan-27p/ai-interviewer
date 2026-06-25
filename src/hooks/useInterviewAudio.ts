'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { DeepgramLiveSTT } from '@/lib/deepgram-live';
import { playStreamingMp3 } from '@/lib/audio-playback';
import { InterviewState, Message, Question } from '@/lib/types';
import { InterviewConfig } from '@/lib/interview-prompts';

interface UseInterviewAudioOptions {
    sessionId: string;
    config: InterviewConfig;
    code: string;
    messages: Message[];
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    currentQuestion: Question | null;
    previousQuestions: string[];
    setPreviousQuestions: React.Dispatch<React.SetStateAction<string[]>>;
    setCurrentQuestion: React.Dispatch<React.SetStateAction<Question | null>>;
    setQuestionsAnswered: React.Dispatch<React.SetStateAction<number>>;
    onInterviewComplete: () => void;
}

interface TurnResponse {
    transcript: string;
    reply: string;
    audioBase64?: string | null;
    streamTts?: boolean;
    newQuestion?: Question | null;
    shouldEndInterview?: boolean;
}

function getMicrophoneErrorMessage(error: unknown): string {
    if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
            return 'Microphone access is blocked. Allow microphone permission in your browser, then try again.';
        }

        if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            return 'No microphone was found. Connect a microphone, then try again.';
        }

        if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            return 'Your microphone is already in use by another app. Close it, then try again.';
        }

        if (error.name === 'NotSupportedError') {
            return 'This browser cannot record microphone audio here. Try Chrome or check that the page is using HTTPS.';
        }
    }

    return 'Could not access microphone. Check your browser permission and try again.';
}

export function useInterviewAudio({
    sessionId,
    config,
    code,
    messages,
    setMessages,
    currentQuestion,
    previousQuestions,
    setPreviousQuestions,
    setCurrentQuestion,
    setQuestionsAnswered,
    onInterviewComplete,
}: UseInterviewAudioOptions) {
    const router = useRouter();
    const [interviewState, setInterviewState] = useState<InterviewState>('idle');
    const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const liveSttRef = useRef<DeepgramLiveSTT | null>(null);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
    const messagesRef = useRef(messages);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            audioPlayerRef.current = new Audio();
        }
    }, []);

    const playResponse = useCallback(
        async (audioBase64: string | null | undefined, streamText?: string) => {
            const player = audioPlayerRef.current;
            if (!player) {
                setInterviewState('idle');
                return;
            }

            const onEnded = () => setInterviewState('idle');

            if (audioBase64 && audioBase64.length > 100) {
                player.src = `data:audio/mp3;base64,${audioBase64}`;
                player.onended = onEnded;
                player.onerror = () => {
                    console.error('Audio playback error');
                    setInterviewState('idle');
                };
                setInterviewState('speaking');
                await player.play().catch((err) => {
                    console.error('Play error:', err);
                    setInterviewState('idle');
                });
                return;
            }

            if (streamText?.trim()) {
                try {
                    setInterviewState('speaking');
                    await playStreamingMp3(
                        player,
                        () =>
                            fetch('/api/tts/stream', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    text: streamText,
                                    voiceId: config.voiceId,
                                }),
                            }),
                        onEnded
                    );
                } catch (error) {
                    console.error('Streaming TTS error:', error);
                    setInterviewState('idle');
                }
                return;
            }

            setInterviewState('idle');
        },
        [config.voiceId]
    );

    const playIntro = useCallback(
        async (question: Question, retryCount = 0) => {
            try {
                setInterviewState('processing');
                const response = await fetch('/api/generate-intro', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        question,
                        interviewType: config.type,
                        voiceId: config.voiceId,
                    }),
                });

                const data = await response.json();
                const { introText, audioBase64 } = data;

                if (introText && retryCount === 0) {
                    setMessages((prev) => [...prev, { role: 'assistant', content: introText }]);
                }

                if (audioBase64 && audioBase64.length > 100) {
                    await playResponse(audioBase64);
                } else if (introText) {
                    await playResponse(null, introText);
                } else if (retryCount < 1) {
                    setTimeout(() => playIntro(question, 1), 1000);
                } else {
                    setInterviewState('idle');
                }
            } catch (error) {
                console.error('Intro error:', error);
                if (retryCount < 1) {
                    setTimeout(() => playIntro(question, 1), 1000);
                } else {
                    setInterviewState('idle');
                }
            }
        },
        [config.type, config.voiceId, playResponse, setMessages]
    );

    const submitTurn = useCallback(
        async (formData: FormData) => {
            const response = await fetch('/api/process-turn', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('API processing failed');
            return response.json() as Promise<TurnResponse>;
        },
        []
    );

    const handleTurnResult = useCallback(
        async (data: TurnResponse) => {
            const { transcript, reply, audioBase64, streamTts, newQuestion, shouldEndInterview } = data;

            setMessages([
                ...messagesRef.current,
                { role: 'user' as const, content: transcript },
                { role: 'assistant' as const, content: reply },
            ]);

            if (newQuestion) {
                setPreviousQuestions((prev) =>
                    currentQuestion ? [...prev, currentQuestion.title] : prev
                );
                setCurrentQuestion(newQuestion);
                setQuestionsAnswered((prev) => prev + 1);
            }

            if (shouldEndInterview) {
                await playResponse(audioBase64, streamTts ? reply : undefined);
                setTimeout(() => onInterviewComplete(), 2000);
                return;
            }

            await playResponse(audioBase64, streamTts ? reply : undefined);
        },
        [
            currentQuestion,
            onInterviewComplete,
            playResponse,
            setCurrentQuestion,
            setMessages,
            setPreviousQuestions,
            setQuestionsAnswered,
        ]
    );

    const processLiveTranscript = useCallback(
        async (transcript: string) => {
            setInterviewState('processing');

            const formData = new FormData();
            formData.append('textResponse', transcript);
            formData.append('sessionId', sessionId);
            formData.append('code', code);
            formData.append('currentQuestionTitle', currentQuestion?.title || '');
            formData.append('previousQuestions', JSON.stringify(previousQuestions));

            try {
                const data = await submitTurn(formData);
                await handleTurnResult(data);
            } catch (error) {
                console.error('Turn processing error:', error);
                setInterviewState('idle');
                toast.error('Something went wrong processing your response. Please try again.', {
                    position: 'top-center',
                    autoClose: 5000,
                });
            }
        },
        [code, currentQuestion, handleTurnResult, previousQuestions, sessionId, submitTurn]
    );

    const startRecording = useCallback(async () => {
        let stream: MediaStream | null = null;

        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new DOMException('Microphone capture is unavailable', 'NotSupportedError');
            }

            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const activeStream = stream;

            const tokenResponse = await fetch(
                `/api/stt/token?voiceId=${encodeURIComponent(config.voiceId)}`
            );
            if (!tokenResponse.ok) throw new Error('Failed to get STT token');

            const { token } = await tokenResponse.json();
            const liveStt = new DeepgramLiveSTT();
            liveSttRef.current = liveStt;

            await liveStt.start({ token, voiceId: config.voiceId });

            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    liveStt.sendAudioChunk(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                activeStream.getTracks().forEach((track) => track.stop());
                const transcript = await liveStt.stop();
                liveSttRef.current = null;

                if (!transcript) {
                    setInterviewState('idle');
                    toast.warning('No speech detected. Try speaking again.', {
                        position: 'top-center',
                        autoClose: 3500,
                    });
                    return;
                }

                await processLiveTranscript(transcript);
            };

            mediaRecorder.start(250);
            setInterviewState('listening');
        } catch (err) {
            console.error('Error accessing microphone:', err);
            stream?.getTracks().forEach((track) => track.stop());
            liveSttRef.current = null;
            setInterviewState('idle');
            toast.error(getMicrophoneErrorMessage(err), {
                position: 'top-center',
                autoClose: 7000,
            });
        }
    }, [config.voiceId, processLiveTranscript]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && interviewState === 'listening') {
            mediaRecorderRef.current.stop();
        }
    }, [interviewState]);

    const endInterview = useCallback(async () => {
        setIsGeneratingFeedback(true);
        toast.info('Generating your feedback report...', {
            position: 'top-center',
            autoClose: 2000,
        });

        try {
            const response = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: messagesRef.current,
                    questions: [currentQuestion?.title, ...previousQuestions].filter(Boolean),
                    interviewType: config.type,
                    sessionId,
                }),
            });

            if (!response.ok) throw new Error('Failed to generate feedback');

            await fetch(`/api/sessions/${sessionId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'completed' }),
            });

            localStorage.removeItem(`interview_lock_${sessionId}`);
            router.replace(`/feedback/${sessionId}`);
        } catch (error) {
            console.error('Error generating feedback:', error);
            toast.error('Failed to generate feedback. Please try again.', {
                position: 'top-center',
                autoClose: 5000,
            });
            setIsGeneratingFeedback(false);
        }
    }, [sessionId, config.type, currentQuestion, previousQuestions, router]);

    return {
        interviewState,
        isGeneratingFeedback,
        playIntro,
        playResponse,
        startRecording,
        stopRecording,
        endInterview,
        isProcessing: interviewState === 'processing',
    };
}
