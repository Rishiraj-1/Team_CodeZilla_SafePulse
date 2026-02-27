import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';

interface AdminPageContext {
    setMapMode: (mode: string) => void;
}

const MOCK_WARNINGS = [
    { id: 1, type: "Crowd Disturbance", time: "10m ago", desc: "Large unauthorized gathering reported near Lonavala market.", lat: 18.7537, lng: 73.4068 },
    { id: 2, type: "Suspicious Activity", time: "25m ago", desc: "Multiple reports of lingering suspect near ATM.", lat: 18.7580, lng: 73.4150 },
    { id: 3, type: "Emergency SOS", time: "1h ago", desc: "Citizen initiated SOS from dark alley.", lat: 18.7490, lng: 73.4020 }
];

export const AdminAlertsPage: React.FC = () => {
    const { setMapMode } = useOutletContext<AdminPageContext>();

    useEffect(() => {
        setMapMode('alerts');
        return () => setMapMode('default');
    }, [setMapMode]);

    return (
        <div className="absolute top-8 right-8 w-80 pointer-events-auto">
            <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4 border border-risk-amber/20 overflow-hidden">
                <div className="absolute inset-0 bg-risk-amber/5 blur-xl pointer-events-none"></div>
                <div className="relative z-10">
                    <h2 className="text-lg font-semibold mb-4 text-risk-amber flex items-center gap-2">
                        <span className="material-symbols-outlined text-[20px]">warning</span> Active Warnings
                    </h2>
                    <div className="space-y-4">
                        {MOCK_WARNINGS.map((warn, i) => (
                            <motion.div
                                key={warn.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-[11px] font-bold text-white/90 uppercase tracking-widest">{warn.type}</span>
                                    <span className="text-[10px] text-white/40">{warn.time}</span>
                                </div>
                                <p className="text-xs text-white/60">{warn.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
