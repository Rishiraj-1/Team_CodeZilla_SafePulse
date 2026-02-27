import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export const PendingReviewPage: React.FC = () => {
    const { logout } = useAuth();

    return (
        <div className="absolute inset-0 flex items-center justify-center p-6 bg-[#050505] text-[#f5f5f5] z-50">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full glass-panel p-8 rounded-2xl text-center border border-white/10 shadow-[0_0_60px_rgba(183,135,245,0.06)]"
            >
                <div className="size-16 bg-risk-amber/10 rounded-2xl flex items-center justify-center border border-risk-amber/20 mx-auto mb-6">
                    <span className="material-symbols-outlined text-[32px] text-risk-amber">pending_actions</span>
                </div>

                <h1 className="text-2xl font-bold mb-3">Application Pending Review</h1>

                <p className="text-sm text-white/50 leading-relaxed mb-8">
                    Your request for an Authority/Guardian account has been successfully submitted and is currently awaiting review by the system administrator.
                    You will receive an email notification once a decision is made.
                </p>

                <div className="flex gap-4">
                    <button
                        onClick={() => window.location.reload()}
                        className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm font-medium"
                    >
                        Check Status
                    </button>
                    <button
                        onClick={logout}
                        className="flex-1 py-3 rounded-xl bg-primary text-[#050505] hover:bg-primary/90 transition-colors text-sm font-medium"
                    >
                        Sign Out
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
