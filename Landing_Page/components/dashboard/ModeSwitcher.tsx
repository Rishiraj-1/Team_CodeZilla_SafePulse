import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const modes = [
    { path: '/citizen', label: 'Citizen', icon: 'person' },
    { path: '/guardian', label: 'Guardian', icon: 'shield' },
    { path: '/admin', label: 'Admin', icon: 'monitoring' },
] as const;

export const ModeSwitcher: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    return (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[60] pointer-events-auto">
            <motion.div
                className="h-11 flex items-center p-1 rounded-full glass"
                style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
            >
                {modes.map((mode, i) => {
                    const isActive = location.pathname.startsWith(mode.path);
                    return (
                        <React.Fragment key={mode.path}>
                            {i > 0 && <div className="w-px h-4 bg-white/[0.06]" />}
                            <button
                                onClick={() => navigate(mode.path)}
                                className={`
                  relative h-full px-5 rounded-full flex items-center gap-2 transition-all duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)] cursor-pointer
                  ${isActive ? 'text-white' : 'text-white/40 hover:text-white/70'}
                `}
                            >
                                {isActive && (
                                    <motion.div
                                        className="absolute inset-0 rounded-full bg-white/[0.06] border border-[#b787f5]/15"
                                        layoutId="mode-bg"
                                        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                                    />
                                )}
                                <span className="material-symbols-outlined text-[16px] relative z-10">{mode.icon}</span>
                                <span className="text-[11px] font-semibold uppercase tracking-wider relative z-10 hidden sm:block">{mode.label}</span>
                                {isActive && (
                                    <motion.div
                                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2px] rounded-full bg-[#b787f5]"
                                        layoutId="mode-indicator"
                                        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                                        style={{ boxShadow: '0 0 8px rgba(183,135,245,0.5)' }}
                                    />
                                )}
                            </button>
                        </React.Fragment>
                    );
                })}
            </motion.div>
        </div>
    );
};
