import React from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    highlight?: boolean;
}

export function StatCard({ icon, label, value, highlight = false }: StatCardProps) {
    return (
        <div className="p-5 bg-white border border-border rounded-lg shadow-sm">
            <div
                className={cn(
                    'w-10 h-10 rounded-md flex items-center justify-center mb-4 border',
                    highlight
                        ? 'bg-blue-50 text-primary border-blue-100'
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                )}
            >
                {icon}
            </div>
            <div className="text-2xl font-semibold tracking-tight mb-1">{value}</div>
            <div className="text-sm text-muted-foreground">{label}</div>
        </div>
    );
}
