'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface AnimatedListProps {
    children: React.ReactNode;
    className?: string;
    stagger?: number;
}

export function AnimatedList({ children, className, stagger = 0.05 }: AnimatedListProps) {
    const reduceMotion = useReducedMotion();

    if (reduceMotion) {
        return <div className={className}>{children}</div>;
    }

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={{
                hidden: {},
                visible: { transition: { staggerChildren: stagger } },
            }}
            className={className}
        >
            {React.Children.map(children, (child) => {
                if (!React.isValidElement(child)) return child;
                return (
                    <motion.div
                        variants={{
                            hidden: { opacity: 0, y: 8 },
                            visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
                        }}
                    >
                        {child}
                    </motion.div>
                );
            })}
        </motion.div>
    );
}
