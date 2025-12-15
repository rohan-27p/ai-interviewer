import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
import { createClient } from '@/lib/supabase/server';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

interface QuestionGenerationParams {
    interviewType: string;
    difficulty: string;
    topics: string[];
    count: number;
}

interface GeneratedQuestion {
    title: string;
    description: string;
    difficulty: string;
    type: string;
    constraints?: string[];
    examples?: any[];
    followup_guidelines?: string[];
}

async function generateQuestionBatch(params: QuestionGenerationParams): Promise<GeneratedQuestion[]> {
    const { interviewType, difficulty, topics, count } = params;

    // Build topic context
    const topicContext = topics.length > 0
        ? `Focus on these topics: ${topics.join(', ')}`
        : '';

    // Create prompts based on interview type
    const typeSpecificPrompts: Record<string, string> = {
        'DSA': `Generate ${count} Data Structures and Algorithms coding problems. Each should include:
- Problem statement
- Constraints (array format)
- Examples with input/output
- Follow-up guidelines for the interviewer`,

        'Frontend': `Generate ${count} Frontend development questions covering:
- React/Angular/Vue concepts
- CSS/HTML/JS fundamentals
- Browser APIs and performance
- Each with follow-up discussion points`,

        'Backend': `Generate ${count} Backend development questions covering:
- API design (REST/GraphQL)
- Database design and optimization
- System architecture
- Each with follow-up discussion points`,

        'Fullstack': `Generate ${count} Full-stack development questions covering:
- End-to-end feature design
- Frontend + Backend integration
- Database and API design
- Each with follow-up discussion points`,

        'Cybersecurity': `Generate ${count} Cybersecurity questions covering:
- Common vulnerabilities (OWASP Top 10)
- Security best practices
- Attack vectors and prevention
- Each with follow-up discussion points`,

        'DevOps': `Generate ${count} DevOps questions covering:
- CI/CD pipelines
- Containerization (Docker/K8s)
- Cloud infrastructure
- Each with follow-up discussion points`
    };

    const systemPrompt = `You are an expert technical interview question generator.

Generate exactly ${count} ${interviewType} interview questions at ${difficulty} difficulty level.
${topicContext}

${typeSpecificPrompts[interviewType] || typeSpecificPrompts['DSA']}

Return ONLY valid JSON array (no markdown, no explanations):

[
  {
    "title": "Question Title",
    "description": "Clear problem description or discussion topic",
    "difficulty": "${difficulty}",
    "type": "${interviewType}",
    ${interviewType === 'DSA' ? '"constraints": ["constraint 1", "constraint 2"],' : ''}
    ${interviewType === 'DSA' ? '"examples": [{"input": "...", "output": "...", "explanation": "..."}],' : ''}
    "followup_guidelines": [
      "Ask about edge cases",
      "Explore time/space complexity",
      "Discuss alternative approaches"
    ]
  }
]

CRITICAL:
- Generate EXACTLY ${count} questions
- All questions must be ${difficulty} difficulty
- Return valid JSON only`;

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Generate ${count} ${interviewType} questions at ${difficulty} difficulty.` }
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.8,
            max_tokens: 2000 * count, // Scale with question count
        });

        const content = completion.choices[0]?.message?.content || '';

        // Clean markdown code fences if present
        const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        // Parse JSON
        const jsonMatch = cleanedContent.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error('No JSON array found in response');
        }

        const questions: GeneratedQuestion[] = JSON.parse(jsonMatch[0]);

        // Validate count
        if (questions.length !== count) {
            console.warn(`Expected ${count} questions, got ${questions.length}. Adjusting...`);

            if (questions.length < count) {
                // Pad with fallback questions
                while (questions.length < count) {
                    questions.push(getFallbackQuestion(interviewType, difficulty));
                }
            } else {
                // Trim excess
                questions.length = count;
            }
        }

        // Ensure all questions have correct difficulty
        questions.forEach(q => {
            q.difficulty = difficulty; // Override LLM if it got it wrong
            q.type = interviewType;
        });

        return questions;

    } catch (error) {
        console.error('Batch generation error:', error);

        // Return fallback questions
        const fallbacks: GeneratedQuestion[] = [];
        for (let i = 0; i < count; i++) {
            fallbacks.push(getFallbackQuestion(interviewType, difficulty));
        }
        return fallbacks;
    }
}

function getFallbackQuestion(type: string, difficulty: string): GeneratedQuestion {
    const fallbacks: Record<string, GeneratedQuestion> = {
        'DSA': {
            title: 'Two Sum',
            description: 'Given an array of integers and a target sum, find two numbers that add up to the target.',
            difficulty,
            type: 'DSA',
            constraints: ['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9'],
            examples: [{ input: 'nums = [2,7,11,15], target = 9', output: '[0,1]' }],
            followup_guidelines: ['Ask about time complexity', 'Discuss hash map approach', 'Explore edge cases']
        },
        'Frontend': {
            title: 'Component Lifecycle',
            description: 'Explain how useEffect works in React. How do you handle cleanup? What are the dependencies?',
            difficulty,
            type: 'Frontend',
            followup_guidelines: ['Ask about dependency array', 'Discuss cleanup functions', 'Compare with class components']
        },
        'Backend': {
            title: 'REST API Design',
            description: 'Design a RESTful API for a blog platform with posts and comments. Discuss endpoints, methods, and status codes.',
            difficulty,
            type: 'Backend',
            followup_guidelines: ['Ask about authentication', 'Discuss pagination', 'Explore rate limiting']
        },
        'Fullstack': {
            title: 'Chat Application Architecture',
            description: 'Design the architecture for a real-time chat application. Consider frontend state management and backend scalability.',
            difficulty,
            type: 'Fullstack',
            followup_guidelines: ['Ask about WebSockets', 'Discuss database schema', 'Explore scaling strategies']
        },
        'Cybersecurity': {
            title: 'SQL Injection Prevention',
            description: 'Explain SQL injection attacks and how to prevent them. Discuss different attack vectors and mitigation strategies.',
            difficulty,
            type: 'Cybersecurity',
            followup_guidelines: ['Ask about prepared statements', 'Discuss ORM safety', 'Explore real-world examples']
        },
        'DevOps': {
            title: 'CI/CD Pipeline',
            description: 'Design a CI/CD pipeline for a web application. Discuss stages, tools, and best practices.',
            difficulty,
            type: 'DevOps',
            followup_guidelines: ['Ask about testing stages', 'Discuss deployment strategies', 'Explore monitoring']
        }
    };

    return fallbacks[type] || fallbacks['DSA'];
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient();

        // Authenticate
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { interviewType, difficulty, topics, count } = body;

        // Validate
        if (!interviewType || !difficulty || !count) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (count < 1 || count > 10) {
            return NextResponse.json({ error: 'Count must be between 1 and 10' }, { status: 400 });
        }

        console.log(`Generating ${count} ${interviewType} questions at ${difficulty} difficulty...`);

        // Generate batch
        const questions = await generateQuestionBatch({
            interviewType,
            difficulty,
            topics: topics || [],
            count
        });

        console.log(`Successfully generated ${questions.length} questions`);

        return NextResponse.json({ questions });

    } catch (error) {
        console.error('Question batch generation error:', error);
        return NextResponse.json({ error: 'Failed to generate questions' }, { status: 500 });
    }
}
