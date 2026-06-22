import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
    params: Promise<{ sessionId: string }>;
}

// GET /api/sessions/[sessionId]/feedback - Fetch feedback for session
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { sessionId } = await params;
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: feedback, error } = await supabase
            .from('feedback_reports')
            .select('*')
            .eq('session_id', sessionId)
            .eq('user_id', user.id)
            .single();

        if (error || !feedback) {
            return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
        }

        const { data: session } = await supabase
            .from('interview_sessions')
            .select('interview_type, difficulty, num_questions, created_at')
            .eq('id', sessionId)
            .eq('user_id', user.id)
            .single();

        return NextResponse.json({
            feedback: {
                overallScore: feedback.overall_score ?? 0,
                overallVerdict: feedback.overall_verdict ?? 'Pending',
                summary: feedback.summary ?? 'No summary available',
                strengths: feedback.strengths ?? [],
                areasForImprovement: feedback.areas_for_improvement ?? [],
                technicalSkills: {
                    score: feedback.technical_skills_score ?? 0,
                    feedback: feedback.technical_skills_feedback ?? '',
                },
                problemSolving: {
                    score: feedback.problem_solving_score ?? 0,
                    feedback: feedback.problem_solving_feedback ?? '',
                },
                communication: {
                    score: feedback.communication_score ?? 0,
                    feedback: feedback.communication_feedback ?? '',
                },
                recommendations: feedback.recommendations ?? [],
            },
            session: session || null,
            createdAt: feedback.created_at,
        });
    } catch (error) {
        console.error('Error fetching feedback:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
