import React from 'react';
import { motion } from 'framer-motion';

interface RiskIndicatorProps {
    score: number;        // 0-10
    label?: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const RiskIndicator: React.FC<RiskIndicatorProps> = ({
    score,
    label,
    size = 'md',
    className = '',
}) => {
    const clamped = Math.max(0, Math.min(10, score));
    const pct = clamped * 10;

    // Color interpolation: green → amber → red
    const getColor = (v: number) => {
        if (v >= 7) return { bar: 'from-emerald-500 to-emerald-400', text: 'text-emerald-400', glow: 'rgba(16,185,129,0.3)' };
        if (v >= 4) return { bar: 'from-amber-500 to-amber-400', text: 'text-amber-400', glow: 'rgba(245,158,11,0.3)' };
        return { bar: 'from-red-500 to-red-400', text: 'text-red-400', glow: 'rgba(239,68,68,0.3)' };
    };

    const color = getColor(clamped);

    const sizes = {
        sm: { num: 'text-lg', h: 'h-1', gap: 'gap-1' },
        md: { num: 'text-3xl', h: 'h-1.5', gap: 'gap-2' },
        lg: { num: 'text-5xl', h: 'h-2', gap: 'gap-3' },
    };

    return (
        <div className={`flex flex-col ${sizes[size].gap} ${className}`}>
            <div className="flex items-baseline gap-1.5">
                <span className={`${sizes[size].num} font-bold tracking-tight ${color.text}`}>
                    {clamped.toFixed(1)}
                </span>
                <span className="text-white/20 text-xs font-medium">/10</span>
            </div>
            {label && <span className="sp-label">{label}</span>}
            <div className={`${sizes[size].h} bg-white/[0.04] rounded-full overflow-hidden w-full`}>
                <motion.div
                    className={`h-full rounded-full bg-gradient-to-r ${color.bar}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
                    style={{ boxShadow: `0 0 12px ${color.glow}` }}
                />
            </div>
        </div>
    );
};
