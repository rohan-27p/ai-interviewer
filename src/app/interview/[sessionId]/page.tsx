'use client';

import React, { use, useRef, useState, useEffect } from 'react';
import { EndInterviewModal } from '@/components/EndInterviewModal';
import { InterviewLayout } from '@/components/interview/InterviewLayout';
import { InterviewLoadingScreen } from '@/components/interview/InterviewLoadingScreen';
import { QuestionPanel } from '@/components/interview/QuestionPanel';
import { EditorPanel } from '@/components/interview/EditorPanel';
import { InterviewerPanel } from '@/components/interview/InterviewerPanel';
import { useInterviewSession } from '@/hooks/useInterviewSession';
import { useInterviewQuestion } from '@/hooks/useInterviewQuestion';
import { useInterviewAudio } from '@/hooks/useInterviewAudio';
import { Message, Question } from '@/lib/types';

interface PageProps {
    params: Promise<{ sessionId: string }>;
}

export default function InterviewPage({ params }: PageProps) {
    const { sessionId } = use(params);
    const [messages, setMessages] = useState<Message[]>([]);
    const [code, setCode] = useState<string>('# Write your solution here\n\n');
    const [endModal, setEndModal] = useState<'end' | 'complete' | null>(null);

    const playIntroRef = useRef<(question: Question, retryCount?: number) => Promise<void>>(
        () => Promise.resolve()
    );

    const { config, isConfigLoaded, isDSA } = useInterviewSession(sessionId);

    const question = useInterviewQuestion({
        sessionId,
        config,
        isConfigLoaded,
        isDSA,
        setCode,
        setMessages,
        playIntro: (q, r) => playIntroRef.current(q, r),
    });

    const audio = useInterviewAudio({
        sessionId,
        config,
        code,
        messages,
        setMessages,
        currentQuestion: question.currentQuestion,
        previousQuestions: question.previousQuestions,
        setPreviousQuestions: question.setPreviousQuestions,
        setCurrentQuestion: question.setCurrentQuestion,
        setQuestionsAnswered: question.setQuestionsAnswered,
        onInterviewComplete: () => setEndModal('complete'),
    });

    useEffect(() => {
        playIntroRef.current = audio.playIntro;
    }, [audio.playIntro]);

    if (!isConfigLoaded) {
        return <InterviewLoadingScreen />;
    }

    return (
        <InterviewLayout>
            <QuestionPanel
                isDSA={isDSA}
                interviewType={config.type}
                questionsAnswered={question.questionsAnswered}
                questionCount={config.questionCount}
                isLoadingQuestion={question.isLoadingQuestion}
                currentQuestion={question.currentQuestion}
                onFetchQuestion={question.fetchQuestion}
            />

            <EditorPanel
                isDSA={isDSA}
                code={code}
                onCodeChange={setCode}
                onEndInterview={() => setEndModal('end')}
                isGeneratingFeedback={audio.isGeneratingFeedback}
                canEndInterview={messages.length >= 2}
            />

            <InterviewerPanel
                interviewType={config.type}
                interviewState={audio.interviewState}
                isLoadingQuestion={question.isLoadingQuestion}
                onStartRecording={audio.startRecording}
                onStopRecording={audio.stopRecording}
            />

            <EndInterviewModal
                open={endModal !== null}
                loading={audio.isGeneratingFeedback}
                title={endModal === 'complete' ? 'Interview complete!' : 'End interview?'}
                description={
                    endModal === 'complete'
                        ? 'You have finished all questions. View your feedback report?'
                        : 'Are you sure you want to end the interview? This will generate your feedback report.'
                }
                confirmLabel={endModal === 'complete' ? 'View feedback' : 'End interview'}
                onConfirm={() => {
                    setEndModal(null);
                    audio.endInterview();
                }}
                onCancel={() => setEndModal(null)}
            />
        </InterviewLayout>
    );
}
