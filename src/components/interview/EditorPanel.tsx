import CodeEditor from '@/components/CodeEditor';
import { Loader2, XCircle } from 'lucide-react';

interface EditorPanelProps {
    isDSA: boolean;
    code: string;
    onCodeChange: (code: string) => void;
    onEndInterview: () => void;
    isGeneratingFeedback: boolean;
    canEndInterview: boolean;
}

export function EditorPanel({
    isDSA,
    code,
    onCodeChange,
    onEndInterview,
    isGeneratingFeedback,
    canEndInterview,
}: EditorPanelProps) {
    return (
        <div className="flex-1 flex flex-col bg-slate-950">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-slate-300">
                        {isDSA ? 'Python' : 'Notes (Optional)'}
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-xs text-emerald-300 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                        Auto-saved
                    </span>
                    <button
                        onClick={onEndInterview}
                        disabled={isGeneratingFeedback || !canEndInterview}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            isGeneratingFeedback
                                ? 'bg-red-500/50 cursor-wait'
                                : !canEndInterview
                                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                  : 'bg-red-500 hover:bg-red-600 text-white'
                        }`}
                    >
                        {isGeneratingFeedback ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Generating Feedback...
                            </>
                        ) : (
                            <>
                                <XCircle className="w-4 h-4" />
                                End Interview
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="flex-1 relative">
                {isDSA ? (
                    <CodeEditor code={code} onChange={onCodeChange} />
                ) : (
                    <div className="h-full p-4">
                        <textarea
                            value={code}
                            onChange={(e) => onCodeChange(e.target.value)}
                            placeholder="Use this space for notes, code snippets, or to organize your thoughts..."
                            className="w-full h-full bg-slate-950 text-slate-200 font-mono text-sm resize-none focus:outline-none placeholder:text-slate-500"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
