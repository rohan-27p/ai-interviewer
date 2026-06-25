export const INTERVIEW_TYPE_DB_MAP: Record<string, string> = {
    dsa: 'DSA',
    frontend: 'Frontend',
    backend: 'Backend',
    fullstack: 'Fullstack',
    cybersecurity: 'Cybersecurity',
    devops: 'DevOps',
};

/** Display labels keyed by slug or DB enum value */
export const INTERVIEW_TYPE_LABELS: Record<string, string> = {
    dsa: 'DSA',
    DSA: 'DSA',
    frontend: 'Frontend',
    Frontend: 'Frontend',
    backend: 'Backend',
    Backend: 'Backend',
    fullstack: 'Fullstack',
    Fullstack: 'Fullstack',
    cybersecurity: 'Cybersecurity',
    Cybersecurity: 'Security',
    devops: 'DevOps',
    DevOps: 'DevOps',
};

export const TOPICS_BY_TYPE: Record<string, string[]> = {
    dsa: ['Arrays', 'Strings', 'Hash Maps', 'Two Pointers', 'Sliding Window', 'Binary Search', 'Trees', 'Graphs', 'Dynamic Programming', 'Recursion', 'Linked Lists', 'Stacks & Queues'],
    frontend: ['React', 'JavaScript', 'TypeScript', 'CSS/SCSS', 'HTML5', 'State Management', 'Performance', 'Testing', 'Accessibility', 'Browser APIs', 'Responsive Design', 'Build Tools'],
    backend: ['REST APIs', 'Node.js', 'Python', 'SQL', 'NoSQL', 'Authentication', 'Caching', 'Microservices', 'Message Queues', 'System Design', 'Security', 'Testing'],
    fullstack: ['React', 'Node.js', 'APIs', 'Databases', 'Authentication', 'Deployment', 'State Management', 'Performance', 'TypeScript', 'Testing', 'DevOps Basics', 'System Design'],
    cybersecurity: ['Network Security', 'Web Security', 'OWASP Top 10', 'Cryptography', 'Penetration Testing', 'Incident Response', 'Security Tools', 'Compliance', 'Threat Modeling', 'Secure Coding'],
    devops: ['Docker', 'Kubernetes', 'CI/CD', 'AWS', 'Azure', 'GCP', 'Terraform', 'Monitoring', 'Linux', 'Networking', 'Scripting', 'GitOps'],
};

/** Convert setup slug to database enum value */
export function formatInterviewTypeForDb(type: string): string {
    return INTERVIEW_TYPE_DB_MAP[type.toLowerCase()] || type;
}

/** Format slug or DB enum for UI display */
export function formatInterviewTypeDisplay(type: string): string {
    if (!type) return 'Interview';
    const byExact = INTERVIEW_TYPE_LABELS[type];
    if (byExact) return byExact;
    const bySlug = INTERVIEW_TYPE_LABELS[type.toLowerCase()];
    if (bySlug) return bySlug;
    return type;
}
