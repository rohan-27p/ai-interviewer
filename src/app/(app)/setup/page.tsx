'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Code, Server, Globe, Shield, Cloud, Layout, SlidersHorizontal } from 'lucide-react';
import { formatInterviewTypeForDb, TOPICS_BY_TYPE } from '@/lib/interview-types';
import { Button } from '@/components/ui/Button';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { cn } from '@/lib/utils';

const INTERVIEW_TYPES = [
    { id: 'dsa', name: 'DSA', icon: Code, description: 'Data Structures & Algorithms' },
    { id: 'frontend', name: 'Frontend', icon: Layout, description: 'React, CSS, JavaScript' },
    { id: 'backend', name: 'Backend', icon: Server, description: 'APIs, Databases, Node.js' },
    { id: 'fullstack', name: 'Fullstack', icon: Globe, description: 'End-to-end development' },
    { id: 'cybersecurity', name: 'Cybersecurity', icon: Shield, description: 'Security, Pentesting' },
    { id: 'devops', name: 'DevOps', icon: Cloud, description: 'CI/CD, Docker, Kubernetes' },
];

const DIFFICULTIES = [
    { id: 'easy', name: 'Easy', description: 'Beginner friendly' },
    { id: 'medium', name: 'Medium', description: 'Standard interview level' },
    { id: 'hard', name: 'Hard', description: 'Senior level' },
];

const ACCENTS = [
    { id: 'en-US', name: 'US', voiceId: 'en-US-matthew', description: 'American accent' },
    { id: 'en-UK', name: 'UK', voiceId: 'en-UK-finley', description: 'British accent' },
    { id: 'en-IN', name: 'India', voiceId: 'en-IN-samar', description: 'Indian accent' },
    { id: 'en-AU', name: 'Australia', voiceId: 'en-AU-jimm', description: 'Australian accent' },
];

export default function SetupPage() {
    const router = useRouter();
    const [interviewType, setInterviewType] = useState<string>('dsa');
    const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
    const [difficulty, setDifficulty] = useState<string>('medium');
    const [voiceAccent, setVoiceAccent] = useState<string>('en-US');
    const [questionCount, setQuestionCount] = useState<number>(3);
    const [isCreatingSession, setIsCreatingSession] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const availableTopics = TOPICS_BY_TYPE[interviewType] || [];

    const toggleTopic = (topic: string) => {
        setSelectedTopics((prev) =>
            prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
        );
    };

    const handleTypeChange = (typeId: string) => {
        setInterviewType(typeId);
        setSelectedTopics([]);
    };

    const startInterview = async () => {
        setIsCreatingSession(true);
        setError(null);

        try {
            const capitalizedDifficulty = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
            const selectedAccent = ACCENTS.find((a) => a.id === voiceAccent);
            const response = await fetch('/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    interview_type: formatInterviewTypeForDb(interviewType),
                    difficulty: capitalizedDifficulty,
                    topics: selectedTopics.length > 0 ? selectedTopics : availableTopics,
                    num_questions: questionCount,
                    voice_id: selectedAccent?.voiceId || 'en-US-matthew',
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to create session');
            }

            const { session } = await response.json();
            router.push(`/instructions/${session.id}`);
        } catch (err) {
            console.error('Error creating session:', err);
            setError('Failed to start interview. Please try again.');
            setIsCreatingSession(false);
        }
    };

    const selectionClass = (selected: boolean) =>
        cn(
            'border rounded-lg transition-all text-left shadow-sm',
            selected
                ? 'border-primary bg-accent/10 ring-2 ring-accent/20'
                : 'border-border bg-card hover:border-primary/40 hover:shadow-md'
        );

    return (
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_320px]">
            <div className="space-y-8">
            <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="grid h-11 w-11 place-items-center rounded-md bg-accent/10 text-primary">
                        <SlidersHorizontal className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight mb-2">Configure interview</h1>
                        <p className="text-muted-foreground text-sm">
                            Build a focused coding-room session with the right track, topics, voice, and question count.
                        </p>
                    </div>
                </div>
            </div>

            {error && <AlertBanner variant="error">{error}</AlertBanner>}

            <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
                <h2 className="text-base font-medium mb-1">Interview type</h2>
                <p className="text-muted-foreground text-sm mb-4">Select the area you want to practice</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {INTERVIEW_TYPES.map((type) => {
                        const Icon = type.icon;
                        const isSelected = interviewType === type.id;
                        return (
                            <button
                                key={type.id}
                                type="button"
                                onClick={() => handleTypeChange(type.id)}
                            className={cn('p-4', selectionClass(isSelected))}
                            >
                                <Icon
                                    className={cn(
                                        'w-5 h-5 mb-2',
                                        isSelected ? 'text-primary' : 'text-muted-foreground'
                                    )}
                                />
                                <div className="font-medium text-sm">{type.name}</div>
                                <div className="text-xs text-muted-foreground">{type.description}</div>
                            </button>
                        );
                    })}
                </div>
            </section>

            <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-base font-medium mb-1">Topics</h2>
                        <p className="text-muted-foreground text-sm">Optional — leave empty for all topics</p>
                    </div>
                    <div className="flex gap-2 text-xs">
                        <button
                            type="button"
                            onClick={() => setSelectedTopics(availableTopics)}
                            className="text-accent hover:underline"
                        >
                            Select all
                        </button>
                        <span className="text-border">|</span>
                        <button
                            type="button"
                            onClick={() => setSelectedTopics([])}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            Clear
                        </button>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {availableTopics.map((topic) => {
                        const isSelected = selectedTopics.includes(topic);
                        return (
                            <button
                                key={topic}
                                type="button"
                                onClick={() => toggleTopic(topic)}
                                className={cn(
                                    'px-3 py-1.5 rounded-md text-sm border transition-colors',
                                    isSelected
                                        ? 'border-primary bg-accent/10 text-primary'
                                        : 'border-border text-muted-foreground hover:border-primary/40'
                                )}
                            >
                                {topic}
                            </button>
                        );
                    })}
                </div>
            </section>

            <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
                <h2 className="text-base font-medium mb-1">Difficulty</h2>
                <p className="text-muted-foreground text-sm mb-4">Choose the challenge level</p>
                <div className="flex gap-3">
                    {DIFFICULTIES.map((diff) => {
                        const isSelected = difficulty === diff.id;
                        return (
                            <button
                                key={diff.id}
                                type="button"
                                onClick={() => setDifficulty(diff.id)}
                                className={cn('flex-1 p-4', selectionClass(isSelected))}
                            >
                                <div className="font-medium capitalize text-sm">{diff.name}</div>
                                <div className="text-xs text-muted-foreground">{diff.description}</div>
                            </button>
                        );
                    })}
                </div>
            </section>

            <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
                <h2 className="text-base font-medium mb-1">Interviewer accent</h2>
                <p className="text-muted-foreground text-sm mb-4">Voice accent for the AI interviewer</p>
                <div className="flex flex-wrap gap-2">
                    {ACCENTS.map((accent) => {
                        const isSelected = voiceAccent === accent.id;
                        return (
                            <button
                                key={accent.id}
                                type="button"
                                onClick={() => setVoiceAccent(accent.id)}
                                className={cn(
                                    'px-4 py-2 rounded-md border text-sm font-medium transition-colors',
                                    isSelected
                                        ? 'border-primary bg-accent/10 text-primary'
                                        : 'border-border text-muted-foreground hover:border-primary/40'
                                )}
                            >
                                {accent.name}
                            </button>
                        );
                    })}
                </div>
            </section>

            <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
                <h2 className="text-base font-medium mb-1">Number of questions</h2>
                <p className="text-muted-foreground text-sm mb-4">How many questions in this session</p>
                <div className="flex items-center gap-6">
                    <input
                        type="range"
                        min="1"
                        max="10"
                        value={questionCount}
                        onChange={(e) => setQuestionCount(Number(e.target.value))}
                        className="flex-1 h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="w-12 h-12 bg-secondary border border-border rounded-lg flex items-center justify-center">
                        <span className="text-lg font-semibold">{questionCount}</span>
                    </div>
                </div>
            </section>

            <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    onClick={startInterview}
                    loading={isCreatingSession}
                    loadingLabel="Creating session..."
                >
                    Start interview
                    <ArrowRight className="w-5 h-5" />
                </Button>
                <p className="text-center text-muted-foreground text-sm mt-4">
                    {interviewType === 'dsa'
                        ? 'You will solve coding problems with a live interviewer'
                        : 'You will answer technical questions in a conversational format'}
                </p>
            </div>
            </div>

            <aside className="lg:sticky lg:top-8 h-fit rounded-lg border border-border bg-slate-950 p-5 text-slate-100 shadow-sm">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <span className="text-sm font-semibold">Session preview</span>
                    <span className="rounded-md bg-emerald-400/10 px-2 py-1 text-xs text-emerald-300">Ready</span>
                </div>
                <div className="mt-5 space-y-4 text-sm">
                    <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">Track</p>
                        <p className="mt-1 font-medium">{INTERVIEW_TYPES.find((type) => type.id === interviewType)?.name}</p>
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">Difficulty</p>
                        <p className="mt-1 font-medium capitalize">{difficulty}</p>
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">Questions</p>
                        <p className="mt-1 font-medium">{questionCount} prompts with voice follow-ups</p>
                    </div>
                    <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
                        <p className="font-mono text-xs text-blue-200">while interviewing:</p>
                        <p className="mt-2 text-xs leading-relaxed text-slate-300">
                            Question rail + editor + AI interviewer stay visible so the session feels like a real technical screen.
                        </p>
                    </div>
                </div>
            </aside>
        </div>
    );
}
