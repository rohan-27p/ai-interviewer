import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const ALLOWED_EXACT_PATHS = new Set(['/dashboard', '/setup', '/profile', '/feedback']);
const DEFAULT_REDIRECT = '/dashboard';

function getSafeRedirectPath(redirect: string | null, origin: string): string {
    if (!redirect) {
        return DEFAULT_REDIRECT;
    }

    try {
        const url = new URL(redirect, origin);

        // Reject external URLs
        if (url.origin !== origin) {
            return DEFAULT_REDIRECT;
        }

        const pathname = url.pathname;

        if (ALLOWED_EXACT_PATHS.has(pathname)) {
            return `${pathname}${url.search}${url.hash}`;
        }

        // Allow /interview/[sessionId] paths
        if (/^\/interview\/[^/]+$/.test(pathname)) {
            return `${pathname}${url.search}${url.hash}`;
        }

        return DEFAULT_REDIRECT;
    } catch {
        return DEFAULT_REDIRECT;
    }
}

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const redirectParam = requestUrl.searchParams.get('redirect');
    const safeRedirect = getSafeRedirectPath(redirectParam, requestUrl.origin);

    if (code) {
        const supabase = await createClient();
        await supabase.auth.exchangeCodeForSession(code);
    }

    return NextResponse.redirect(new URL(safeRedirect, requestUrl.origin));
}
