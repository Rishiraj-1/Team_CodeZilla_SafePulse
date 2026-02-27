import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

interface GlowButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
    children: React.ReactNode;
    variant?: 'primary' | 'ghost' | 'danger' | 'success';
    size?: 'sm' | 'md' | 'lg';
    icon?: string;
    fullWidth?: boolean;
}

export const GlowButton: React.FC<GlowButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    icon,
    fullWidth = false,
    className = '',
    ...props
}) => {

    const sizes = {
        sm: 'h-8 px-3 text-[10px] gap-1.5',
        md: 'h-10 px-5 text-xs gap-2',
        lg: 'h-12 px-6 text-sm gap-2.5',
    };

    const variants = {
        primary: `
      bg-gradient-to-r from-[#b787f5]/90 to-[#9b6ddb]/90
      text-white font-semibold tracking-wide
      border border-[#b787f5]/20
      shadow-[0_0_20px_rgba(183,135,245,0.15)]
      hover:shadow-[0_0_30px_rgba(183,135,245,0.25)]
    `,
        ghost: `
      bg-transparent text-white/60 font-medium
      border border-white/[0.06]
      hover:bg-white/[0.03] hover:text-white/80 hover:border-white/10
    `,
        danger: `
      bg-gradient-to-r from-[#ef4444]/80 to-[#dc2626]/80
      text-white font-semibold tracking-wide
      border border-red-500/20
      shadow-[0_0_20px_rgba(239,68,68,0.12)]
      hover:shadow-[0_0_30px_rgba(239,68,68,0.2)]
    `,
        success: `
      bg-gradient-to-r from-[#10b981]/80 to-[#059669]/80
      text-white font-semibold tracking-wide
      border border-emerald-500/20
      shadow-[0_0_20px_rgba(16,185,129,0.12)]
      hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]
    `,
    };

    return (
        <motion.button
            className={`
        inline-flex items-center justify-center
        rounded-[var(--sp-radius-sm)] uppercase
        transition-all duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)]
        cursor-pointer select-none
        ${sizes[size]} ${variants[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            {...props}
        >
            {icon && <span className="material-symbols-outlined text-[16px] leading-none">{icon}</span>}
            {children}
        </motion.button>
    );
};
