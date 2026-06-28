import Link from 'next/link';
import { ArrowLeft, Loader2, ListChecks } from 'lucide-react';
import { Question } from '@/lib/types';
import { stringify } from '@/lib/interview-prompts';
import { formatInterviewTypeDisplay } from '@/lib/interview-types';
import { cn } from '@/lib/utils';

interface QuestionPanelProps {
    isDSA: boolean;
    interviewType: string;
    questionsAnswered: number;
    questionCount: number;
    isLoadingQuestion: boolean;
    currentQuestion: Question | null;
    onFetchQuestion: () => void;
}

export function QuestionPanel({
    isDSA,
    interviewType,
    questionsAnswered,
    questionCount,
    isLoadingQuestion,
    currentQuestion,
    onFetchQuestion,
}: QuestionPanelProps) {
    return (
        <div className="w-[340px] min-w-[300px] flex flex-col border-r border-border bg-card">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div>
                    <span className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <ListChecks className="h-3.5 w-3.5" />
                        {isDSA ? 'Question' : 'Topic'}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded-md bg-accent/10 text-primary border border-accent/20">
                            {formatInterviewTypeDisplay(interviewType)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {questionsAnswered + 1}/{questionCount}
                        </span>
                    </div>
                </div>
                <Link href="/dashboard" className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                </Link>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
                {isLoadingQuestion ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                        <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                        <p className="text-sm text-muted-foreground">Generating {isDSA ? 'question' : 'topic'}...</p>
                    </div>
                ) : currentQuestion ? (
                    <>
                        <div className="flex items-center gap-2 mb-3">
                            <h2 className="text-lg font-semibold tracking-tight text-foreground">{currentQuestion.title}</h2>
                            <span
                                className={cn(
                                    'text-xs px-2 py-0.5 rounded-md',
                                    currentQuestion.difficulty === 'Easy' && 'bg-success/10 text-success',
                                    currentQuestion.difficulty === 'Medium' && 'bg-warning/10 text-warning',
                                    currentQuestion.difficulty === 'Hard' && 'bg-destructive/10 text-destructive'
                                )}
                            >
                                {currentQuestion.difficulty}
                            </span>
                        </div>

                        <div className="text-sm text-muted-foreground leading-relaxed space-y-4 break-words">
                            <p>{currentQuestion.description}</p>
                        </div>

                        {isDSA && currentQuestion.constraints && currentQuestion.constraints.length > 0 && (
                            <div className="mt-6">
                                <h3 className="text-sm font-medium mb-3">Constraints</h3>
                                <ul className="text-sm text-muted-foreground space-y-1.5">
                                    {currentQuestion.constraints.map((c, i) => (
                                        <li key={i}>· {stringify(c)}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {isDSA && currentQuestion.examples && currentQuestion.examples.length > 0 && (
                            <div className="mt-6">
                                <h3 className="text-sm font-medium mb-3">Examples</h3>
                                {currentQuestion.examples.map((ex, i) => (
                                    <div
                                        key={i}
                                        className="bg-secondary rounded-md p-3 font-mono text-xs text-muted-foreground mb-3 border border-border"
                                    >
                                        <div>
                                            <span className="text-foreground">Input:</span> {stringify(ex.input)}
                                        </div>
                                        <div className="mt-1">
                                            <span className="text-foreground">Output:</span> {stringify(ex.output)}
                                        </div>
                                        {ex.explanation && (
                                            <div className="mt-1">{stringify(ex.explanation)}</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {!isDSA && (
                            <div className="mt-6 p-4 bg-accent/10 rounded-md border border-accent/20">
                                <h3 className="text-sm font-medium mb-2">Interview tips</h3>
                                <ul className="text-xs text-muted-foreground space-y-1">
                                    <li>· Explain your thought process clearly</li>
                                    <li>· Use specific examples from your experience</li>
                                    <li>· Ask clarifying questions if needed</li>
                                </ul>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center text-muted-foreground py-8">
                        <p>No question loaded</p>
                        <button
                            type="button"
                            onClick={onFetchQuestion}
                            className="mt-3 text-accent hover:underline text-sm"
                        >
                            Generate question
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
