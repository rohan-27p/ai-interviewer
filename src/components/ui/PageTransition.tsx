'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface PageTransitionProps {
    children: React.ReactNode;
    className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
    const reduceMotion = useReducedMotion();

    if (reduceMotion) {
        return <div className={className}>{children}</div>;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={className}
        >
            {children}
        </motion.div>
    );
}
