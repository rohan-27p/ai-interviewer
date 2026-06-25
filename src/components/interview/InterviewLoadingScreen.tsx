import { Loader2 } from 'lucide-react';

export function InterviewLoadingScreen() {
    return (
        <div className="h-screen w-full bg-surface-elevated flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
    );
}
