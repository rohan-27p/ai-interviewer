'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Mic, Code, Brain, Target, Trophy, CheckCircle2, PlayCircle, Timer } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/Button';

export default function HomePage() {
    return (
        <div className="min-h-screen overflow-x-hidden interview-surface text-foreground">
            <nav className="flex items-center justify-between px-4 sm:px-8 py-6 max-w-6xl mx-auto">
                <Logo href="/" />
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    <Link href="/login">
                        <Button variant="primary" size="sm">Sign in</Button>
                    </Link>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto px-4 sm:px-8 pt-10 sm:pt-16 pb-24">
                <section className="grid min-w-0 lg:grid-cols-[0.92fr_1.08fr] gap-10 lg:gap-14 items-center">
                    <div className="min-w-0">
                    <h1 className="text-2xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-tight mb-6 text-foreground break-words">
                        Train for technical interviews in a real coding room
                    </h1>
                    <p className="text-base sm:text-lg text-muted-foreground max-w-xl mb-8">
                        Practice DSA, system design, frontend, backend, and DevOps with an AI interviewer,
                        a live editor, and feedback that reads like a hiring debrief.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Link href="/signup">
                            <Button variant="primary" size="lg" className="w-full sm:w-auto">
                                Start practice
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </Link>
                        <Link href="/login">
                            <Button variant="outline" size="lg" className="w-full sm:w-auto">
                                <PlayCircle className="w-4 h-4" />
                                Open workspace
                            </Button>
                        </Link>
                    </div>
                    <div className="mt-8 grid grid-cols-3 gap-4 max-w-md">
                        <LandingStat icon={<Target className="w-5 h-5" />} value="7" label="Tracks" />
                        <LandingStat icon={<Timer className="w-5 h-5" />} value="Live" label="Voice loop" />
                        <LandingStat icon={<Trophy className="w-5 h-5" />} value="10pt" label="Scoring" />
                    </div>
                    </div>

                    <InterviewPreview />
                </section>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24">
                    <FeatureCard
                        icon={<Mic className="w-5 h-5" />}
                        title="Voice interviews"
                        description="Practice explaining your thinking out loud with a conversational interviewer."
                    />
                    <FeatureCard
                        icon={<Code className="w-5 h-5" />}
                        title="Coding-room layout"
                        description="Question, editor, voice, and progress panels stay visible during the session."
                    />
                    <FeatureCard
                        icon={<Brain className="w-5 h-5" />}
                        title="Multiple domains"
                        description="Configure sessions for DSA, frontend, backend, fullstack, security, and DevOps."
                    />
                </div>

                <div className="mt-24">
                    <h2 className="text-2xl font-semibold tracking-tight mb-4">Choose the loop you need</h2>
                    <p className="text-muted-foreground mb-8">Practice for the role you are targeting</p>
                    <div className="flex flex-wrap gap-2">
                        {['DSA', 'Frontend', 'Backend', 'Fullstack', 'Cybersecurity', 'DevOps', 'System Design'].map((type) => (
                            <span
                                key={type}
                                className="px-3 py-1.5 bg-card border border-border rounded-md text-sm text-muted-foreground"
                            >
                                {type}
                            </span>
                        ))}
                    </div>
                </div>

                <section className="mt-24 rounded-lg border border-border bg-card p-6 shadow-sm">
                    <div className="grid gap-4 md:grid-cols-3">
                        {['Clarify the prompt out loud', 'Code with interviewer pressure', 'Review verdict and next steps'].map((step, index) => (
                            <div key={step} className="flex items-start gap-3">
                                <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />
                                <div>
                                    <p className="font-medium">Step {index + 1}</p>
                                    <p className="text-sm text-muted-foreground">{step}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            <footer className="border-t border-border py-8">
                <div className="max-w-6xl mx-auto px-4 sm:px-8 text-center text-muted-foreground text-sm">
                    Interview practice platform
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
            <div className="w-10 h-10 rounded-md bg-accent/10 flex items-center justify-center mb-4 text-primary">
                {icon}
            </div>
            <h3 className="font-medium mb-2">{title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
        </div>
    );
}

function LandingStat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
    return (
        <div>
            <div className="inline-flex items-center justify-center w-10 h-10 bg-card border border-border rounded-md mb-3 text-primary shadow-sm">
                {icon}
            </div>
            <div className="text-xl font-semibold mb-0.5">{value}</div>
            <div className="text-sm text-muted-foreground">{label}</div>
        </div>
    );
}

function InterviewPreview() {
    return (
        <div className="w-full min-w-0 max-w-full rounded-lg border border-slate-200 bg-white shadow-xl shadow-slate-900/10 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </div>
                <span className="text-xs font-medium text-slate-500">Live Interview · DSA Medium</span>
            </div>
            <div className="grid min-h-[420px] min-w-0 md:grid-cols-[0.86fr_1.14fr]">
                <div className="min-w-0 border-r border-slate-200 p-5">
                    <div className="mb-4 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Question</span>
                        <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">Medium</span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-950">Two Sum Variant</h3>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">
                        Return the indexes of two numbers that add up to the target. Explain complexity before coding.
                    </p>
                    <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-600">
                        Input: nums = [2, 7, 11, 15]<br />
                        target = 9<br />
                        Output: [0, 1]
                    </div>
                    <div className="mt-6 flex items-center gap-2 text-sm text-emerald-700">
                        <Mic className="h-4 w-4" />
                        Interviewer is listening
                    </div>
                </div>
                <div className="min-w-0 flex flex-col bg-slate-950 text-slate-100">
                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                        <span className="font-mono text-xs text-slate-300">solution.py</span>
                        <span className="text-xs text-emerald-300">Auto-saved</span>
                    </div>
                    <pre className="flex-1 overflow-hidden whitespace-pre-wrap break-words p-5 text-sm leading-7 text-slate-300">
{`def two_sum(nums, target):
    seen = {}
    for i, value in enumerate(nums):
        need = target - value
        if need in seen:
            return [seen[need], i]
        seen[value] = i`}
                    </pre>
                    <div className="grid grid-cols-3 border-t border-white/10 text-center text-xs">
                        <div className="p-3 text-emerald-300">Passed 3/3</div>
                        <div className="p-3 text-slate-300">O(n)</div>
                        <div className="p-3 text-blue-300">Q 1/3</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
