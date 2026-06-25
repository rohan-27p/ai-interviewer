'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';

interface EndInterviewModalProps {
    open: boolean;
    loading?: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export function EndInterviewModal({
    open,
    loading = false,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
}: EndInterviewModalProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-card border border-border rounded-lg p-6 shadow-lg">
                <h2 className="text-lg font-semibold mb-2">{title}</h2>
                <p className="text-sm text-muted-foreground mb-6">{description}</p>
                <div className="flex gap-3 justify-end">
                    <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
                        {cancelLabel}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={onConfirm} loading={loading} loadingLabel="Processing...">
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}
