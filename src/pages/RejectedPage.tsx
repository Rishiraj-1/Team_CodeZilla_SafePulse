import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export const RejectedPage: React.FC = () => {
    const { logout } = useAuth();

    return (
        <div className="absolute inset-0 flex items-center justify-center p-6 bg-[#050505] text-[#f5f5f5] z-50">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full glass-panel p-8 rounded-2xl text-center border border-red-500/10 shadow-[0_0_60px_rgba(239,68,68,0.06)]"
            >
                <div className="size-16 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20 mx-auto mb-6">
                    <span className="material-symbols-outlined text-[32px] text-red-400">cancel</span>
                </div>

                <h1 className="text-2xl font-bold mb-3">Application Rejected</h1>

                <p className="text-sm text-white/50 leading-relaxed mb-8">
                    We regret to inform you that your request for an Authority/Guardian account could not be approved at this time.
                    Please contact support or your local administration for further details regarding this decision.
                </p>

                <button
                    onClick={logout}
                    className="w-full py-3 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors text-sm font-medium"
                >
                    Sign Out & Return Home
                </button>
            </motion.div>
        </div>
    );
};
