import VoiceInterface from '@/components/VoiceInterface';
import { InterviewState } from '@/lib/types';
import { formatInterviewTypeDisplay } from '@/lib/interview-types';
import { Mic, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormEvent, useState } from 'react';

interface InterviewerPanelProps {
    interviewType: string;
    interviewState: InterviewState;
    isLoadingQuestion: boolean;
    onStartRecording: () => void;
    onStopRecording: () => void;
    onSubmitText: (text: string) => Promise<void>;
}

export function InterviewerPanel({
    interviewType,
    interviewState,
    isLoadingQuestion,
    onStartRecording,
    onStopRecording,
    onSubmitText,
}: InterviewerPanelProps) {
    const [textResponse, setTextResponse] = useState('');
    const isDisabled =
        interviewState === 'processing' || interviewState === 'speaking' || isLoadingQuestion;

    const handleTextSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const response = textResponse.trim();
        if (!response || isDisabled || interviewState === 'listening') return;

        await onSubmitText(response);
        setTextResponse('');
    };

    return (
        <div className="w-[300px] min-w-[260px] bg-card flex flex-col border-l border-border">
            <div className="flex-1 flex flex-col items-center justify-center p-6 border-b border-border">
                <div className="relative">
                    {interviewState === 'speaking' && (
                        <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
                    )}

                    <div
                        className={cn(
                            'w-20 h-20 rounded-full flex items-center justify-center border-2 transition-all duration-300 bg-secondary',
                            interviewState === 'speaking' ? 'border-primary shadow-lg shadow-blue-500/20' : 'border-border'
                        )}
                    >
                        <svg className="w-10 h-10 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                    </div>
                </div>

                <p className="mt-4 text-sm font-semibold">AI Interviewer</p>
                <p className="text-xs text-muted-foreground">{formatInterviewTypeDisplay(interviewType)}</p>

                {interviewState === 'speaking' && (
                    <div className="mt-2 flex items-center gap-0.5">
                        {[1, 2, 3, 4].map((i) => (
                            <span
                                key={i}
                            className="w-1 bg-primary rounded-full animate-pulse"
                                style={{ height: `${8 + (i % 3) * 6}px`, animationDelay: `${i * 0.1}s` }}
                            />
                        ))}
                    </div>
                )}
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-secondary">
                <VoiceInterface state={interviewState} />

                <div className="mt-6 flex flex-col items-center gap-3">
                    {interviewState === 'listening' ? (
                        <button
                            type="button"
                            onClick={onStopRecording}
                            className="w-14 h-14 rounded-full bg-destructive hover:opacity-90 flex items-center justify-center transition-all"
                        >
                            <Square className="w-5 h-5 fill-current text-destructive-foreground" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={onStartRecording}
                            disabled={isDisabled}
                            className={cn(
                                'w-14 h-14 rounded-full flex items-center justify-center transition-all',
                                isDisabled
                                    ? 'bg-secondary cursor-not-allowed text-muted-foreground'
                                    : 'bg-primary text-primary-foreground hover:bg-blue-700 shadow-lg shadow-blue-600/20'
                            )}
                        >
                            <Mic className="w-6 h-6" />
                        </button>
                    )}

                    <p className="text-muted-foreground text-xs font-medium">
                        {isLoadingQuestion && 'Loading...'}
                        {!isLoadingQuestion && interviewState === 'idle' && 'Click to speak'}
                        {interviewState === 'listening' && 'Listening...'}
                        {interviewState === 'processing' && 'Processing...'}
                        {interviewState === 'speaking' && 'Speaking...'}
                    </p>
                </div>

                <form onSubmit={handleTextSubmit} className="mt-5 w-full space-y-2">
                    <label htmlFor="text-response" className="sr-only">
                        Type your answer
                    </label>
                    <textarea
                        id="text-response"
                        value={textResponse}
                        onChange={(event) => setTextResponse(event.target.value)}
                        disabled={isDisabled || interviewState === 'listening'}
                        placeholder="Or type your answer…"
                        rows={3}
                        className="w-full resize-none rounded-md border border-border bg-background p-2 text-xs outline-none placeholder:text-muted-foreground focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <button
                        type="submit"
                        disabled={!textResponse.trim() || isDisabled || interviewState === 'listening'}
                        className="w-full rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Send answer
                    </button>
                </form>
            </div>
        </div>
    );
}
