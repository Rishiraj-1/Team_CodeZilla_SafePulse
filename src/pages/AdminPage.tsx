import React from 'react';
import { useOutletContext, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

interface AdminPageContext {
    setMapMode: (mode: 'default' | 'routing' | 'dangerZone' | 'guardianView') => void;
}

export const AdminPage: React.FC = () => {
    const { setMapMode } = useOutletContext<AdminPageContext>();
    const navigate = useNavigate();
    const location = useLocation();

    const isRoot = location.pathname.endsWith('/admin') || location.pathname.endsWith('/admin/');

    const MOCK_LIVE_REPORTS = [
        { id: 1, type: "SOS Triggered", time: "2m ago", desc: "Citizen initiated SOS via SafePulse guardian network in Sector 4 transit corridor." },
        { id: 2, type: "Deviation Alert", time: "14m ago", desc: "User deviated significantly from usual safe commute pattern. Guardian notified." },
        { id: 3, type: "Audio Anomaly", time: "28m ago", desc: "Distress audio pattern detected from registered user's device near local ATM." }
    ];

    return (
        <div className="absolute inset-0 pointer-events-none flex h-screen overflow-hidden z-20">
            {/* LEFT SIDEBAR - Vertical Icons Only */}
            <aside className="pointer-events-auto w-20 flex-shrink-0 border-r border-white/5 bg-[#050505]/95 backdrop-blur-xl flex flex-col items-center py-8 gap-8 z-30 shadow-2xl">
                <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shadow-glow-subtle relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-xl blur-md"></div>
                    <span className="material-symbols-outlined text-[20px] text-primary z-10">admin_panel_settings</span>
                </div>

                <nav className="flex flex-col gap-6 mt-8">
                    {/* Navigation Items */}
                    {[
                        { id: 'overview', icon: 'monitoring', label: 'Overview', path: '/app/admin', exact: true },
                        { id: 'alerts', icon: 'warning', label: 'Alerts', path: '/app/admin/alerts', exact: false },
                        { id: 'personnel', icon: 'group', label: 'Personnel', path: '/app/admin/personnel', exact: false }
                    ].map((item) => {
                        const isActive = item.exact ? isRoot : location.pathname.includes(item.path);
                        return (
                            <button
                                key={item.id}
                                onClick={() => navigate(item.path)}
                                className={`relative group flex items-center justify-center p-3 rounded-xl transition-all duration-300 ${isActive
                                    ? 'bg-white/5 border border-white/10 shadow-glow-subtle'
                                    : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                                    }`}
                            >
                                {isActive && <div className="absolute inset-0 bg-primary/10 rounded-xl blur-sm opacity-100"></div>}
                                <span className={`material-symbols-outlined text-[22px] z-10 ${isActive ? 'text-primary' : ''}`}>{item.icon}</span>
                                <div className={`absolute left-full ml-4 px-3 py-1.5 bg-[#111111] text-[10px] uppercase font-semibold tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10 shadow-xl z-50 ${isActive ? 'text-white' : 'text-white/80'}`}>
                                    {item.label}
                                </div>
                            </button>
                        );
                    })}
                </nav>
            </aside>

            {/* MAIN PANEL - Overlay UI on map */}
            {isRoot ? (
                <main className="flex-1 pointer-events-none p-8 pt-24 flex gap-8">

                    {/* Analytics Columns */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                        className="w-80 flex flex-col gap-6"
                    >
                        {/* Header Widget */}
                        <div className="glass-panel p-6 pointer-events-auto relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
                            <h2 className="text-[9px] font-semibold text-white/40 uppercase tracking-[0.25em] mb-4">Command Center</h2>
                            <div className="flex items-end gap-3">
                                <span className="text-3xl font-light text-white tracking-tight">System Nominal</span>
                            </div>
                            <div className="mt-8 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-medium text-white/50 tracking-wide uppercase">Active Guardians</span>
                                    <span className="text-xs font-semibold text-white">24 / 30</span>
                                </div>
                                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full w-4/5 bg-primary/80 rounded-full shadow-[0_0_10px_rgba(183,135,245,0.5)]"></div>
                                </div>
                            </div>
                        </div>

                        {/* Report Feed */}
                        <div className="glass-panel p-6 pointer-events-auto flex-1 flex flex-col max-h-[50vh]">
                            <h3 className="text-[9px] font-semibold text-white/40 uppercase tracking-[0.25em] mb-4">Live Reports</h3>
                            <div className="flex flex-col gap-3 overflow-y-auto scrollbar-hide">
                                {MOCK_LIVE_REPORTS.map((report, i) => (
                                    <motion.div
                                        key={report.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.15, duration: 0.6 }}
                                        className="p-4 rounded-xl border border-white/5 bg-white/[0.02] flex flex-col gap-2 hover:bg-white/[0.04] transition-colors cursor-pointer"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="size-1.5 rounded-full bg-risk-amber shadow-[0_0_8px_rgba(255,79,79,0.5)] animate-pulse"></span>
                                                <span className="text-[9px] font-bold text-white/80 uppercase tracking-widest">{report.type}</span>
                                            </div>
                                            <span className="text-[9px] text-white/40 font-mono">{report.time}</span>
                                        </div>
                                        <span className="text-[11px] text-white/60 leading-relaxed">{report.desc}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </motion.div>

                    {/* Right Column / Map Area Overlay */}
                    <div className="flex-1 flex flex-col justify-start items-end pr-8">
                        {/* Risk Cluster Info */}
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.8 }}
                            className="glass-panel p-6 pointer-events-auto w-80 border border-risk-amber/20 relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-risk-amber/5 blur-xl pointer-events-none"></div>
                            <div className="relative z-10 flex flex-col gap-1">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[16px] text-risk-amber">warning</span>
                                        <span className="text-[9px] font-semibold text-risk-amber uppercase tracking-widest shrink-0">Priority Alert</span>
                                    </div>
                                    <button onClick={() => setMapMode('dangerZone')} className="text-[9px] font-bold text-white bg-risk-amber/20 px-3 py-1.5 rounded-lg border border-risk-amber/30 hover:bg-risk-amber/40 transition-colors uppercase tracking-wider">Focus</button>
                                </div>
                                <span className="text-2xl font-light text-white tracking-tight">Sector Alpha</span>
                                <span className="text-[11px] text-white/60 mt-2 leading-relaxed">Multiple route deviations and SOS alerts detected from citizens traveling alone. Immediate guardian patrol recommended.</span>
                            </div>
                        </motion.div>
                    </div>

                </main>
            ) : (
                <main className={`flex-1 pointer-events-none z-40 overflow-y-auto relative h-screen ${location.pathname.includes('/personnel') ? 'bg-[#050505]/80 backdrop-blur-md pointer-events-auto' : ''
                    }`}>
                    <Outlet context={{ setMapMode }} />
                </main>
            )}
        </div>
    );
};
