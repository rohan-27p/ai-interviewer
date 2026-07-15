'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { DEFAULT_INTERVIEW_CONFIG, InterviewConfig } from '@/lib/interview-prompts';

export function useInterviewSession(sessionId: string) {
    const router = useRouter();
    const [config, setConfig] = useState<InterviewConfig>(DEFAULT_INTERVIEW_CONFIG);
    const [isConfigLoaded, setIsConfigLoaded] = useState(false);
    const hasInitialized = useRef(false);

    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        const initSession = async () => {
            try {
                const lockKey = `interview_lock_${sessionId}`;
                const existingLock = localStorage.getItem(lockKey);
                if (existingLock && Date.now() - parseInt(existingLock) < 5000) {
                    toast.error('Interview already open in another tab!');
                    router.replace('/dashboard');
                    return;
                }
                localStorage.setItem(lockKey, Date.now().toString());

                const response = await fetch(`/api/sessions/${sessionId}`);

                if (response.status === 403) {
                    const data = await response.json();
                    toast.error(data.error || 'Session not accessible');
                    router.replace(data.redirectTo || '/dashboard');
                    return;
                }

                if (!response.ok) {
                    toast.error('Session not found. Redirecting...');
                    router.replace('/dashboard');
                    return;
                }

                const { session } = await response.json();

                setConfig({
                    type: session.interview_type?.toLowerCase() || 'dsa',
                    topics: session.topics || [],
                    difficulty: session.difficulty || 'medium',
                    questionCount: session.num_questions || 3,
                    voiceId: session.voice_id || 'en-US-matthew',
                });
                setIsConfigLoaded(true);

                toast.info('Interview started! Good luck!', {
                    position: 'top-right',
                    autoClose: 3000,
                });
            } catch (error) {
                console.error('Error fetching session:', error);
                toast.error('Failed to load interview session');
                router.replace('/dashboard');
            }
        };

        initSession();

        return () => {
            localStorage.removeItem(`interview_lock_${sessionId}`);
        };
    }, [sessionId, router]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = 'You have an active interview. Are you sure you want to leave?';
            return e.returnValue;
        };

        const handlePopState = () => {
            window.history.pushState(null, '', window.location.href);
            toast.warning('Please use the End Interview button to exit.', {
                position: 'top-center',
                autoClose: 2000,
            });
        };

        window.history.pushState(null, '', window.location.href);

        const lockInterval = setInterval(() => {
            localStorage.setItem(`interview_lock_${sessionId}`, Date.now().toString());
        }, 2000);

        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('popstate', handlePopState);
            clearInterval(lockInterval);
        };
    }, [sessionId]);

    useEffect(() => {
        const oneHour = 60 * 60 * 1000;
        const timer = setTimeout(async () => {
            toast.warning('Interview time limit (1 hour) reached. Generating feedback...', {
                position: 'top-center',
                autoClose: 5000,
            });
            try {
                await fetch(`/api/sessions/${sessionId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'abandoned' }),
                });
            } catch (err) {
                console.error('Failed to mark session as abandoned:', err);
            }
            router.replace('/dashboard');
        }, oneHour);

        return () => clearTimeout(timer);
    }, [router, sessionId]);

    return {
        config,
        isConfigLoaded,
        isDSA: config.type === 'dsa',
    };
}
