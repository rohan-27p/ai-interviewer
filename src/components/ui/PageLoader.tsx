import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageLoaderProps {
    label?: string;
    fullScreen?: boolean;
}

export function PageLoader({ label, fullScreen = true }: PageLoaderProps) {
    return (
        <div
            className={cn(
                'bg-background flex flex-col items-center justify-center gap-3',
                fullScreen ? 'min-h-screen' : 'h-full'
            )}
        >
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            {label && <p className="text-sm text-muted-foreground">{label}</p>}
        </div>
    );
}
