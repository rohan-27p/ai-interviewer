// Database type definitions — keep in sync with supabase/schema.sql
export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    public: {
        Tables: {
            user_profiles: {
                Row: {
                    id: string
                    full_name: string | null
                    avatar_url: string | null
                    total_interviews: number
                    total_questions_solved: number
                    average_score: number
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    full_name?: string | null
                    avatar_url?: string | null
                    total_interviews?: number
                    total_questions_solved?: number
                    average_score?: number
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    full_name?: string | null
                    avatar_url?: string | null
                    total_interviews?: number
                    total_questions_solved?: number
                    average_score?: number
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            interview_sessions: {
                Row: {
                    id: string
                    user_id: string
                    interview_type: 'DSA' | 'Frontend' | 'Backend' | 'Fullstack' | 'Cybersecurity' | 'DevOps'
                    difficulty: 'Easy' | 'Medium' | 'Hard'
                    topics: string[]
                    num_questions: number
                    voice_id: string
                    status: 'active' | 'completed' | 'abandoned'
                    current_question_index: number
                    messages: Json
                    started_at: string
                    completed_at: string | null
                    duration_seconds: number | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    interview_type: 'DSA' | 'Frontend' | 'Backend' | 'Fullstack' | 'Cybersecurity' | 'DevOps'
                    difficulty: 'Easy' | 'Medium' | 'Hard'
                    topics: string[]
                    num_questions?: number
                    voice_id?: string
                    status?: 'active' | 'completed' | 'abandoned'
                    current_question_index?: number
                    messages?: Json
                    started_at?: string
                    completed_at?: string | null
                    duration_seconds?: number | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    interview_type?: 'DSA' | 'Frontend' | 'Backend' | 'Fullstack' | 'Cybersecurity' | 'DevOps'
                    difficulty?: 'Easy' | 'Medium' | 'Hard'
                    topics?: string[]
                    num_questions?: number
                    voice_id?: string
                    status?: 'active' | 'completed' | 'abandoned'
                    current_question_index?: number
                    messages?: Json
                    started_at?: string
                    completed_at?: string | null
                    duration_seconds?: number | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            interview_questions: {
                Row: {
                    id: string
                    session_id: string
                    question_title: string
                    question_description: string
                    question_difficulty: 'Easy' | 'Medium' | 'Hard'
                    question_type: string
                    constraints: string[] | null
                    examples: Json | null
                    followup_guidelines: string[] | null
                    question_order: number
                    status: 'pending' | 'active' | 'completed'
                    followup_count: number
                    user_code: string | null
                    user_answer: string | null
                    is_completed: boolean
                    asked_at: string | null
                    completed_at: string | null
                    time_spent_seconds: number | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    session_id: string
                    question_title: string
                    question_description: string
                    question_difficulty: 'Easy' | 'Medium' | 'Hard'
                    question_type: string
                    constraints?: string[] | null
                    examples?: Json | null
                    followup_guidelines?: string[] | null
                    question_order: number
                    status?: 'pending' | 'active' | 'completed'
                    followup_count?: number
                    user_code?: string | null
                    user_answer?: string | null
                    is_completed?: boolean
                    asked_at?: string | null
                    completed_at?: string | null
                    time_spent_seconds?: number | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    session_id?: string
                    question_title?: string
                    question_description?: string
                    question_difficulty?: 'Easy' | 'Medium' | 'Hard'
                    question_type?: string
                    constraints?: string[] | null
                    examples?: Json | null
                    followup_guidelines?: string[] | null
                    question_order?: number
                    status?: 'pending' | 'active' | 'completed'
                    followup_count?: number
                    user_code?: string | null
                    user_answer?: string | null
                    is_completed?: boolean
                    asked_at?: string | null
                    completed_at?: string | null
                    time_spent_seconds?: number | null
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: 'interview_questions_session_id_fkey'
                        columns: ['session_id']
                        isOneToOne: false
                        referencedRelation: 'interview_sessions'
                        referencedColumns: ['id']
                    },
                ]
            }
            feedback_reports: {
                Row: {
                    id: string
                    session_id: string
                    user_id: string
                    overall_score: number
                    overall_verdict: 'Strong Hire' | 'Hire' | 'Lean Hire' | 'Lean No Hire' | 'No Hire'
                    summary: string
                    strengths: string[]
                    areas_for_improvement: string[]
                    recommendations: string[]
                    technical_skills_score: number | null
                    technical_skills_feedback: string | null
                    problem_solving_score: number | null
                    problem_solving_feedback: string | null
                    communication_score: number | null
                    communication_feedback: string | null
                    full_feedback_json: Json | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    session_id: string
                    user_id: string
                    overall_score: number
                    overall_verdict: 'Strong Hire' | 'Hire' | 'Lean Hire' | 'Lean No Hire' | 'No Hire'
                    summary: string
                    strengths: string[]
                    areas_for_improvement: string[]
                    recommendations: string[]
                    technical_skills_score?: number | null
                    technical_skills_feedback?: string | null
                    problem_solving_score?: number | null
                    problem_solving_feedback?: string | null
                    communication_score?: number | null
                    communication_feedback?: string | null
                    full_feedback_json?: Json | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    session_id?: string
                    user_id?: string
                    overall_score?: number
                    overall_verdict?: 'Strong Hire' | 'Hire' | 'Lean Hire' | 'Lean No Hire' | 'No Hire'
                    summary?: string
                    strengths?: string[]
                    areas_for_improvement?: string[]
                    recommendations?: string[]
                    technical_skills_score?: number | null
                    technical_skills_feedback?: string | null
                    problem_solving_score?: number | null
                    problem_solving_feedback?: string | null
                    communication_score?: number | null
                    communication_feedback?: string | null
                    full_feedback_json?: Json | null
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: 'feedback_reports_session_id_fkey'
                        columns: ['session_id']
                        isOneToOne: true
                        referencedRelation: 'interview_sessions'
                        referencedColumns: ['id']
                    },
                ]
            }
        }
        Views: {
            user_statistics: {
                Row: {
                    user_id: string
                    full_name: string | null
                    total_interviews: number
                    average_score: number
                    total_sessions: number
                    completed_sessions: number
                    total_questions_attempted: number
                    questions_completed: number
                }
                Insert: never
                Update: never
                Relationships: []
            }
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}
