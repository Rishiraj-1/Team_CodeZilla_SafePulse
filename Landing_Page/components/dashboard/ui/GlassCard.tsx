import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

interface GlassCardProps extends HTMLMotionProps<'div'> {
    children: React.ReactNode;
    variant?: 'default' | 'violet' | 'surface';
    glow?: boolean;
    noPadding?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
    children,
    variant = 'default',
    glow = false,
    noPadding = false,
    className = '',
    ...props
}) => {
    const base = 'rounded-[var(--sp-radius)] transition-all duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)]';
    const padding = noPadding ? '' : 'p-5';

    const variants = {
        default: 'glass-card',
        violet: 'glass-violet',
        surface: 'glass',
    };

    return (
        <motion.div
            className={`${base} ${variants[variant]} ${padding} ${glow ? 'glow-v' : ''} ${className}`}
            whileHover={{ scale: 1.005 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            {...props}
        >
            {children}
        </motion.div>
    );
};
