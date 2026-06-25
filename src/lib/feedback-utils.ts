export function getVerdictColor(verdict: string): string {
    const colors: Record<string, string> = {
        'Strong Hire': 'text-green-400',
        Hire: 'text-green-400',
        'Lean Hire': 'text-blue-400',
        'Lean No Hire': 'text-orange-400',
        'No Hire': 'text-red-400',
    };
    return colors[verdict] || 'text-gray-400';
}

export function getScoreColor(score: number): string {
    if (score >= 8) return 'text-green-400 border-green-400';
    if (score >= 6) return 'text-yellow-400 border-yellow-400';
    return 'text-red-400 border-red-400';
}
