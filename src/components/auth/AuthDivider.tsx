interface AuthDividerProps {
    label: string;
}

export function AuthDivider({ label }: AuthDividerProps) {
    return (
        <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-surface text-text-muted">{label}</span>
            </div>
        </div>
    );
}
