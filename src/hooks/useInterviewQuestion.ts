'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Message, Question } from '@/lib/types';
import { getSystemPrompt, InterviewConfig } from '@/lib/interview-prompts';

interface UseInterviewQuestionOptions {
    sessionId: string;
    config: InterviewConfig;
    isConfigLoaded: boolean;
    isDSA: boolean;
    setCode: (code: string) => void;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    playIntro: (question: Question, retryCount?: number) => Promise<void>;
}

export function useInterviewQuestion({
    sessionId,
    config,
    isConfigLoaded,
    isDSA,
    setCode,
    setMessages,
    playIntro,
}: UseInterviewQuestionOptions) {
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [previousQuestions, setPreviousQuestions] = useState<string[]>([]);
    const [isLoadingQuestion, setIsLoadingQuestion] = useState(true);
    const [questionsAnswered, setQuestionsAnswered] = useState(0);

    const lastPlayedQuestionId = useRef<string | null>(null);
    const isFirstQuestion = useRef(true);
    const hasFetchedInitial = useRef(false);

    const fetchQuestion = useCallback(async (): Promise<boolean> => {
        setIsLoadingQuestion(true);
        try {
            const response = await fetch(`/api/questions?sessionId=${sessionId}&status=active`);
            if (!response.ok) throw new Error('Failed to fetch question');

            const { question } = await response.json();
            if (question) {
                setCurrentQuestion({
                    title: question.question_title,
                    description: question.question_description,
                    difficulty: question.question_difficulty,
                    constraints: question.constraints || [],
                    examples: question.examples || [],
                });
                return true;
            }
        } catch (error) {
            console.error('Error fetching question:', error);
        } finally {
            setIsLoadingQuestion(false);
        }

        return false;
    }, [sessionId]);

    useEffect(() => {
        if (!isConfigLoaded || hasFetchedInitial.current) return;
        hasFetchedInitial.current = true;

        let cancelled = false;
        let retryTimer: ReturnType<typeof setTimeout> | undefined;
        let attempts = 0;

        const loadInitialQuestion = async () => {
            const found = await fetchQuestion();
            if (found || cancelled || attempts >= 14) return;

            attempts += 1;
            retryTimer = setTimeout(loadInitialQuestion, 2_000);
        };

        loadInitialQuestion();

        return () => {
            cancelled = true;
            if (retryTimer) clearTimeout(retryTimer);
        };
    }, [isConfigLoaded, fetchQuestion]);

    useEffect(() => {
        if (!currentQuestion || !isConfigLoaded) return;
        if (lastPlayedQuestionId.current === currentQuestion.title) return;
        lastPlayedQuestionId.current = currentQuestion.title;

        setMessages((prev) => [...prev, getSystemPrompt(currentQuestion, config)]);

        if (isDSA) {
            setCode(`# ${currentQuestion.title}\n# Write your solution here\n\ndef solution():\n    pass`);
        }

        if (isFirstQuestion.current) {
            isFirstQuestion.current = false;
            playIntro(currentQuestion);
        }
    }, [currentQuestion, isConfigLoaded, config, isDSA, setCode, setMessages, playIntro]);

    return {
        currentQuestion,
        setCurrentQuestion,
        previousQuestions,
        setPreviousQuestions,
        isLoadingQuestion,
        questionsAnswered,
        setQuestionsAnswered,
        fetchQuestion,
    };
}
