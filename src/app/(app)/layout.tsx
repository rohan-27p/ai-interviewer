import { AppShell } from '@/components/AppShell';
import { PageTransition } from '@/components/ui/PageTransition';

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
    return (
        <AppShell>
            <PageTransition className="px-4 sm:px-6 lg:px-8 py-8 lg:py-10 max-w-7xl mx-auto">
                {children}
            </PageTransition>
        </AppShell>
    );
}
