import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Browser-side Supabase client
// Use this in Client Components
export function createClient(): SupabaseClient<Database> {
    return createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    ) as unknown as SupabaseClient<Database>
}
