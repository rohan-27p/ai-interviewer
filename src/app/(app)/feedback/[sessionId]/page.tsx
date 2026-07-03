'use client';

import React, { useEffect, useState, useRef, use } from 'react';
import { Target, MessageSquare, Lightbulb, TrendingUp, CheckCircle, AlertCircle, Download } from 'lucide-react';
import Link from 'next/link';
import { PageLoader } from '@/components/ui/PageLoader';
import { Button } from '@/components/ui/Button';

interface FeedbackData {
    overallScore?: number;
    overallVerdict?: string;
    summary?: string;
    strengths?: string[];
    areasForImprovement?: string[];
    technicalSkills?: { score: number; feedback: string };
    problemSolving?: { score: number; feedback: string };
    communication?: { score: number; feedback: string };
    recommendations?: string[];
}

interface SessionData {
    interview_type: string;
    difficulty: string;
    created_at: string;
}

function escapeHtml(value: unknown): string {
    return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
    })[character] ?? character);
}

function normalizeScore(value: unknown): number {
    const score = Number(value);
    return Number.isFinite(score) ? Math.min(10, Math.max(0, score)) : 0;
}

function ScoreCircle({ score, label }: { score: number; label: string }) {
    const getColor = (s: number) => {
        if (s >= 8) return 'text-success border-success';
        if (s >= 6) return 'text-warning border-warning';
        return 'text-destructive border-destructive';
    };

    return (
        <div className="flex flex-col items-center gap-2">
            <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center ${getColor(score)}`}>
                <span className="text-xl font-semibold">{score}</span>
            </div>
            <span className="text-sm text-muted-foreground">{label}</span>
        </div>
    );
}

interface PageProps {
    params: Promise<{ sessionId: string }>;
}

export default function FeedbackPage({ params }: PageProps) {
    const { sessionId } = use(params);
    const [feedback, setFeedback] = useState<FeedbackData | null>(null);
    const [session, setSession] = useState<SessionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    // Fetch feedback from DB on mount
    useEffect(() => {
        const fetchFeedback = async () => {
            try {
                const response = await fetch(`/api/sessions/${sessionId}/feedback`);

                if (!response.ok) {
                    if (response.status === 404) {
                        setError('Feedback not found for this session');
                    } else {
                        setError('Failed to load feedback');
                    }
                    return;
                }

                const data = await response.json();
                setFeedback(data.feedback);
                setSession(data.session);
            } catch (err) {
                console.error('Error fetching feedback:', err);
                setError('Failed to load feedback');
            } finally {
                setLoading(false);
            }
        };

        fetchFeedback();
    }, [sessionId]);

    const getVerdictColor = (verdict: string | undefined | null) => {
        if (!verdict) return 'text-muted-foreground bg-secondary';
        if (verdict.includes('Strong Hire') || verdict.includes('Hire')) return 'text-success bg-success/10';
        if (verdict.includes('Lean')) return 'text-warning bg-warning/10';
        return 'text-destructive bg-destructive/10';
    };

    const exportToPDF = async () => {
        if (!feedback) return;
        setIsExporting(true);
        const overallScore = normalizeScore(feedback.overallScore);
        const overallVerdict = escapeHtml(feedback.overallVerdict || 'Pending');
        const technicalSkills = feedback.technicalSkills ?? { score: 0, feedback: '' };
        const problemSolving = feedback.problemSolving ?? { score: 0, feedback: '' };
        const communication = feedback.communication ?? { score: 0, feedback: '' };
        const technicalScore = normalizeScore(technicalSkills.score);
        const problemSolvingScore = normalizeScore(problemSolving.score);
        const communicationScore = normalizeScore(communication.score);
        const technicalFeedback = escapeHtml(technicalSkills.feedback);
        const problemSolvingFeedback = escapeHtml(problemSolving.feedback);
        const communicationFeedback = escapeHtml(communication.feedback);
        const strengths = feedback.strengths ?? [];
        const areasForImprovement = feedback.areasForImprovement ?? [];
        const recommendations = feedback.recommendations ?? [];
        const safeSessionId = escapeHtml(sessionId);
        const summary = escapeHtml(feedback.summary);

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Interview Feedback Report - ${safeSessionId}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        padding: 40px;
                        max-width: 800px;
                        margin: 0 auto;
                        color: #1a1a1a;
                        line-height: 1.6;
                    }
                    .header { 
                        text-align: center; 
                        margin-bottom: 40px;
                        padding-bottom: 20px;
                        border-bottom: 2px solid #e5e5e5;
                    }
                    .logo { font-size: 24px; font-weight: bold; color: #f97316; margin-bottom: 8px; }
                    .uid { color: #666; font-size: 12px; }
                    .score-section {
                        display: flex;
                        align-items: center;
                        gap: 30px;
                        margin-bottom: 40px;
                        padding: 30px;
                        background: #f8f8f8;
                        border-radius: 12px;
                    }
                    .main-score {
                        width: 100px;
                        height: 100px;
                        border-radius: 50%;
                        border: 4px solid ${overallScore >= 8 ? '#22c55e' : overallScore >= 6 ? '#eab308' : '#ef4444'};
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 36px;
                        font-weight: bold;
                        color: ${overallScore >= 8 ? '#22c55e' : overallScore >= 6 ? '#eab308' : '#ef4444'};
                        flex-shrink: 0;
                    }
                    .verdict {
                        display: inline-block;
                        padding: 6px 16px;
                        border-radius: 20px;
                        font-size: 14px;
                        font-weight: 500;
                        margin-bottom: 10px;
                        background: ${overallVerdict.includes('Hire') ? '#dcfce7' : overallVerdict.includes('Lean') ? '#fef9c3' : '#fee2e2'};
                        color: ${overallVerdict.includes('Hire') ? '#166534' : overallVerdict.includes('Lean') ? '#854d0e' : '#dc2626'};
                    }
                    .summary { color: #444; font-size: 14px; }
                    h2 { font-size: 18px; margin: 30px 0 15px; color: #1a1a1a; }
                    .scores-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
                    .score-card { padding: 20px; background: #f8f8f8; border-radius: 8px; text-align: center; }
                    .score-card h3 { font-size: 14px; margin-bottom: 10px; color: #666; }
                    .score-card .score { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
                    .score-card p { font-size: 12px; color: #666; }
                    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                    .list-section { padding: 20px; background: #f8f8f8; border-radius: 8px; }
                    .list-section h3 { font-size: 16px; margin-bottom: 12px; }
                    .list-section ul { list-style: none; }
                    .list-section li { padding: 8px 0; font-size: 13px; border-bottom: 1px solid #e5e5e5; }
                    .list-section li:last-child { border-bottom: none; }
                    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center; color: #999; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">🎤 InterviewAI</div>
                    <div>Interview Feedback Report</div>
                    <div class="uid">Session: ${safeSessionId} | Generated: ${new Date().toLocaleDateString()}</div>
                </div>

                <div class="score-section">
                    <div class="main-score">${overallScore}</div>
                    <div>
                        <div class="verdict">${overallVerdict}</div>
                        <p class="summary">${summary}</p>
                    </div>
                </div>

                <h2>Score Breakdown</h2>
                <div class="scores-grid">
                    <div class="score-card">
                        <h3>Technical Skills</h3>
                        <div class="score" style="color: ${technicalScore >= 8 ? '#22c55e' : technicalScore >= 6 ? '#eab308' : '#ef4444'}">${technicalScore}/10</div>
                        <p>${technicalFeedback}</p>
                    </div>
                    <div class="score-card">
                        <h3>Problem Solving</h3>
                        <div class="score" style="color: ${problemSolvingScore >= 8 ? '#22c55e' : problemSolvingScore >= 6 ? '#eab308' : '#ef4444'}">${problemSolvingScore}/10</div>
                        <p>${problemSolvingFeedback}</p>
                    </div>
                    <div class="score-card">
                        <h3>Communication</h3>
                        <div class="score" style="color: ${communicationScore >= 8 ? '#22c55e' : communicationScore >= 6 ? '#eab308' : '#ef4444'}">${communicationScore}/10</div>
                        <p>${communicationFeedback}</p>
                    </div>
                </div>

                <div class="two-col">
                    <div class="list-section">
                        <h3>✅ Strengths</h3>
                        <ul>${strengths.map((strength) => `<li>• ${escapeHtml(strength)}</li>`).join('')}</ul>
                    </div>
                    <div class="list-section">
                        <h3>⚠️ Areas for Improvement</h3>
                        <ul>${areasForImprovement.map((area) => `<li>• ${escapeHtml(area)}</li>`).join('')}</ul>
                    </div>
                </div>

                <div class="list-section" style="background: #fff7ed; border: 1px solid #fed7aa;">
                    <h3 style="color: #f97316;">📈 Recommendations</h3>
                    <ul>${recommendations.map((recommendation, index) => `<li>${index + 1}. ${escapeHtml(recommendation)}</li>`).join('')}</ul>
                </div>

                <div class="footer">Generated by InterviewAI • Practice makes perfect! 🚀</div>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.onload = () => {
                printWindow.print();
                setIsExporting(false);
            };
            setTimeout(() => setIsExporting(false), 2000);
        } else {
            alert('Please allow popups to download PDF');
            setIsExporting(false);
        }
    };

    if (loading) {
        return <PageLoader />;
    }

    if (error || !feedback) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-lg max-w-md text-center">
                    <h2 className="text-lg font-semibold mb-2">Failed to load feedback</h2>
                    <p className="text-sm text-muted-foreground mb-4">{error}</p>
                    <div className="flex items-center justify-center gap-3">
                        <Button variant="primary" onClick={() => window.location.reload()}>
                            Try again
                        </Button>
                        <Link href="/feedback"><Button variant="outline">Back to feedback</Button></Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <Link href="/feedback" className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block">
                        ← Back to feedback
                    </Link>
                    <h1 className="text-2xl font-semibold tracking-tight">Interview feedback</h1>
                    {session && (
                        <p className="text-sm text-muted-foreground mt-1">
                            {session.interview_type} · {session.difficulty}
                        </p>
                    )}
                </div>
                <Button variant="outline" onClick={exportToPDF} disabled={isExporting} loading={isExporting} loadingLabel="Exporting...">
                    {!isExporting && <Download className="w-4 h-4" />}
                    Export PDF
                </Button>
            </div>

            <div ref={contentRef} className="space-y-6">
                <div className="bg-card border border-border rounded-lg p-8">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        <div className="flex flex-col items-center">
                            <div className={`w-28 h-28 rounded-full border-4 flex items-center justify-center ${
                                (feedback.overallScore ?? 0) >= 8 ? 'border-success text-success' :
                                (feedback.overallScore ?? 0) >= 6 ? 'border-warning text-warning' :
                                'border-destructive text-destructive'
                            }`}>
                                <span className="text-4xl font-semibold">{feedback.overallScore ?? 0}</span>
                            </div>
                            <span className="text-sm text-muted-foreground mt-2">out of 10</span>
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getVerdictColor(feedback.overallVerdict)}`}>
                                {feedback.overallVerdict}
                            </span>
                            <p className="text-muted-foreground leading-relaxed mt-4">{feedback.summary}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { icon: Target, title: 'Technical Skills', data: feedback.technicalSkills },
                        { icon: Lightbulb, title: 'Problem Solving', data: feedback.problemSolving },
                        { icon: MessageSquare, title: 'Communication', data: feedback.communication },
                    ].map(({ icon: Icon, title, data }) => (
                        <div key={title} className="bg-card border border-border rounded-lg p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 rounded-md bg-secondary flex items-center justify-center">
                                    <Icon className="w-4 h-4 text-muted-foreground" />
                                </div>
                                <h3 className="font-medium">{title}</h3>
                            </div>
                            <ScoreCircle score={data?.score ?? 0} label="Score" />
                            <p className="text-sm text-muted-foreground mt-4 leading-relaxed">{data?.feedback ?? ''}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-card border border-border rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <CheckCircle className="w-5 h-5 text-success" />
                            <h3 className="font-medium">Strengths</h3>
                        </div>
                        <ul className="space-y-2">
                            {(feedback.strengths ?? []).map((strength, i) => (
                                <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                                    <span className="w-1.5 h-1.5 rounded-full bg-success mt-2 shrink-0" />
                                    {strength}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertCircle className="w-5 h-5 text-warning" />
                            <h3 className="font-medium">Areas for improvement</h3>
                        </div>
                        <ul className="space-y-2">
                            {(feedback.areasForImprovement ?? []).map((area, i) => (
                                <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                                    <span className="w-1.5 h-1.5 rounded-full bg-warning mt-2 shrink-0" />
                                    {area}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="bg-card border border-border rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <TrendingUp className="w-5 h-5 text-accent" />
                        <h3 className="font-medium">Recommendations</h3>
                    </div>
                    <ul className="space-y-2">
                        {(feedback.recommendations ?? []).map((rec, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                                <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs shrink-0">
                                    {i + 1}
                                </span>
                                {rec}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                    <Button variant="outline" onClick={exportToPDF} disabled={isExporting} loading={isExporting}>
                        Download report
                    </Button>
                    <Link href="/setup">
                        <Button variant="primary">Start new interview</Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
