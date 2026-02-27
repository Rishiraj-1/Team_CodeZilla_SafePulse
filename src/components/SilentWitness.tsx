import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const SilentWitnessIndicator: React.FC<{ onTriggerAlert?: () => void }> = ({ onTriggerAlert }) => {
    return (
        <div className="absolute top-28 left-6 z-30 pointer-events-auto">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={onTriggerAlert}
                className="flex items-center gap-3 px-3 py-2 bg-[#0a0a0a]/80 backdrop-blur-md rounded-full border border-white/5 shadow-glass group cursor-pointer hover:bg-white/5 transition-colors"
            >
                <div className="relative flex items-center justify-center">
                    <span className="absolute size-2.5 bg-primary/20 rounded-full animate-ping"></span>
                    <span className="relative size-1.5 bg-primary rounded-full shadow-[0_0_8px_rgba(183,135,245,0.8)]"></span>
                </div>
                <div className="flex flex-col pr-1">
                    <span className="text-[9px] font-bold text-white/50 uppercase tracking-widest group-hover:text-white/80 transition-colors">Silent Witness</span>
                    <span className="text-[8px] text-white/30 font-mono">Monitoring</span>
                </div>
            </motion.div>
        </div>
    );
};

export const DeviationAlertModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSos: () => void;
}> = ({ isOpen, onClose, onSos }) => {
    const [countdown, setCountdown] = useState(10);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (isOpen) {
            setCountdown(10);
            timerRef.current = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current!);
                        // Auto-trigger SOS when countdown hits 0
                        onSos();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
            setCountdown(10);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isOpen]);

    const handleImOkay = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        onClose();
    };

    const handleSos = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        onSos();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="fixed inset-0 z-[100] flex items-end justify-center pb-12 px-6 pointer-events-auto bg-black/30 backdrop-blur-[2px]"
                >
                    <motion.div
                        initial={{ y: 50, opacity: 0, scale: 0.95 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 30, opacity: 0, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className="w-full max-w-sm glass-panel p-6 border border-risk-amber/40 shadow-[0_10px_40px_rgba(255,79,79,0.2)] relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-risk-amber/10 blur-3xl saturate-200 pointer-events-none rounded-full translate-x-1/2 -translate-y-1/2"></div>

                        {/* Header */}
                        <div className="flex items-start gap-4 z-10 relative">
                            <div className="size-12 rounded-full border border-risk-amber/30 bg-risk-amber/10 flex items-center justify-center shrink-0 shadow-glow-amber">
                                <span className="material-symbols-outlined text-[24px] text-risk-amber">route</span>
                            </div>
                            <div className="flex flex-col gap-1 pt-1 flex-1">
                                <span className="text-[10px] font-bold text-risk-amber tracking-widest uppercase">Route Deviation Detected</span>
                                <h3 className="text-sm font-medium text-white tracking-wide">You are off your planned route.</h3>
                                <p className="text-[11px] text-white/50 leading-relaxed mt-1">Silent Witness detected an unexpected departure. Was this intentional?</p>
                            </div>
                        </div>

                        {/* Countdown Ring */}
                        <div className="relative z-10 flex flex-col items-center gap-1 my-5">
                            <div className="relative size-14 flex items-center justify-center">
                                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 56 56">
                                    <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,79,79,0.15)" strokeWidth="3" />
                                    <circle
                                        cx="28" cy="28" r="24"
                                        fill="none"
                                        stroke={countdown <= 3 ? '#ff4f4f' : '#f59e0b'}
                                        strokeWidth="3"
                                        strokeDasharray={`${2 * Math.PI * 24}`}
                                        strokeDashoffset={`${2 * Math.PI * 24 * (1 - countdown / 10)}`}
                                        strokeLinecap="round"
                                        style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
                                    />
                                </svg>
                                <span className={`text-lg font-bold font-mono ${countdown <= 3 ? 'text-danger-red' : 'text-risk-amber'}`}>{countdown}</span>
                            </div>
                            <span className="text-[9px] text-white/30 uppercase tracking-widest">Auto-SOS in {countdown}s</span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 relative z-10 w-full">
                            <button
                                onClick={handleImOkay}
                                className="flex-1 h-11 border border-white/10 hover:border-white/20 hover:bg-white/5 text-white/60 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
                            >
                                I'm Okay
                            </button>
                            <button
                                onClick={handleSos}
                                className="flex-1 h-11 bg-danger-red/20 hover:bg-danger-red/30 border border-danger-red/40 text-danger-red hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shadow-glow-amber"
                            >
                                SOS Now
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
