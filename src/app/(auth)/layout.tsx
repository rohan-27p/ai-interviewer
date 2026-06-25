import React, { Suspense } from 'react';
import { PageLoader } from '@/components/ui/PageLoader';

export default function AuthGroupLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={<PageLoader />}>
            {children}
        </Suspense>
    );
}
