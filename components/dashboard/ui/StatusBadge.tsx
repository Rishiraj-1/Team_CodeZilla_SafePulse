import React from 'react';

type BadgeVariant = 'live' | 'alert' | 'warning' | 'info' | 'neutral';

interface StatusBadgeProps {
    label: string;
    variant?: BadgeVariant;
    dot?: boolean;
    className?: string;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string; dot: string; glow: string }> = {
    live: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400', glow: 'shadow-[0_0_6px_rgba(16,185,129,0.5)]' },
    alert: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400', glow: 'shadow-[0_0_6px_rgba(239,68,68,0.5)]' },
    warning: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400', glow: 'shadow-[0_0_6px_rgba(245,158,11,0.5)]' },
    info: { bg: 'bg-[#b787f5]/10', text: 'text-[#b787f5]', dot: 'bg-[#b787f5]', glow: 'shadow-[0_0_6px_rgba(183,135,245,0.5)]' },
    neutral: { bg: 'bg-white/5', text: 'text-white/50', dot: 'bg-white/40', glow: '' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
    label,
    variant = 'neutral',
    dot = true,
    className = '',
}) => {
    const s = variantStyles[variant];

    return (
        <span className={`
      inline-flex items-center gap-1.5 px-2 py-0.5
      rounded-md text-[9px] font-bold uppercase tracking-wider
      border border-current/10
      ${s.bg} ${s.text} ${className}
    `}>
            {dot && (
                <span className={`w-[5px] h-[5px] rounded-full ${s.dot} ${s.glow} ${variant === 'live' || variant === 'alert' ? 'animate-[dot-pulse_2s_ease-in-out_infinite]' : ''}`} />
            )}
            {label}
        </span>
    );
};
