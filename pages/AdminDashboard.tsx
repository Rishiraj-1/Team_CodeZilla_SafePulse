import React, { useState } from 'react';
import { ViewState } from '../types';

interface AdminDashboardProps {
    setView: (view: ViewState) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ setView }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="bg-background-dark text-white font-sans h-screen flex flex-col overflow-hidden relative selection:bg-orange-500/20">

            {/* MOBILE OVERLAYS */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            {/* Header - Dark & Operational */}
            <header className="hidden lg:flex h-16 bg-[#18181b]/95 backdrop-blur-md border-b border-white/10 items-center justify-between px-6 z-30 shadow-lg shrink-0">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="size-9 bg-orange-500/20 text-orange-500 rounded-lg flex items-center justify-center border border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                            <span className="material-symbols-outlined">security</span>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold leading-none text-white">SafePulse Admin</h1>
                            <p className="text-xs text-gray-400 mt-0.5 font-medium">Indore Sector • Live Monitoring</p>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-white/10"></div>
                    <nav className="hidden md:flex gap-2">
                        <button className="px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-400 text-sm font-bold border border-orange-500/20">Command Center</button>
                        <button className="px-3 py-1.5 rounded-lg hover:bg-white/5 text-gray-400 text-sm font-medium transition-colors">Analytics</button>
                    </nav>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative hidden md:block">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg">search</span>
                        <input className="h-9 pl-9 pr-4 rounded-lg bg-white/5 border border-white/10 text-sm w-64 focus:ring-2 focus:ring-orange-500/50 text-white placeholder-gray-600" placeholder="Search sector or unit..." />
                    </div>
                    <div className="size-9 rounded-full bg-gray-700 overflow-hidden border border-white/10 ring-2 ring-orange-500/20">
                        <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBb2PSyrHqSFX7QOK35nPhVTuI920y8XUFE6rODMIkHEgyxMgkJyDZmn7Hsku6R8hfAi_Hradr8HLmsYTbuVUEZrAAthsU3OzWvxMgWzqbUBV626jjjwLtb6pOOfEgbK7fq8XvqpGJIW6MJhYDd5jg_zPmmCz-uPFx3ook42mAVqoGnFA-wvoa7ZYUtr-uLS1aq1i6Gz0uTjDKQ_CD_m0WIWVEZ0cN9fKFB3AvvA4isNFfs-AtxBAusCfKWegfPFewLPdbq07xPfII" alt="Admin" className="w-full h-full object-cover grayscale" />
                    </div>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden relative">

                {/* MOBILE ONLY: Admin Toggle */}
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="lg:hidden absolute top-4 left-4 z-30 bg-[#121212] text-white p-2.5 rounded-xl shadow-lg border border-white/10 flex items-center gap-2 active:scale-95 transition-transform"
                >
                    <span className="material-symbols-outlined text-[20px]">menu</span>
                    <div className="flex flex-col items-start leading-none">
                        <span className="text-[10px] font-bold text-orange-500 uppercase">ADMIN</span>
                        <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">SECTOR 1</span>
                    </div>
                </button>

                {/* Map Pane - Dark Mode */}
                <section className="flex-1 bg-[#0f1012] relative">
                    <div className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuD8a5Rdanet0q-f4hLUEcXv4QH4otri22To2-Njeh07QGTqLx745OCL1zzaOJWSRzQLNkFDWKeLMqmUBudWn86-ukKQvlptNszCJib_pNW2NqXDcxSnLigoGtrHobAzOxDEy2qtuGtF6tm-B_1V-jmr7Z6jnpE6W4_RY9nYKajtSGoDqTtg6qGS2k4A5zhP-V_qeE1U6jXrhbJNb--1en_8u5y1NP_pJZWZ8j63ME4XYMaHXR5UwViqLuWOBXqMbnjd1Xl4vAEeySc')" }}></div>

                    {/* Dark Mode Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-[#0f1012]/80 via-transparent to-[#0f1012]/80 pointer-events-none"></div>

                    {/* Heatmap Overlays - Neon */}
                    <div className="absolute top-1/3 left-1/4 size-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none mix-blend-screen animate-pulse-slow"></div>

                    {/* Markers - Neon */}
                    <div className="absolute top-[38%] left-[28%] cursor-pointer group">
                        <div className="absolute size-12 rounded-full bg-danger-red/20 -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
                        <div className="relative z-10 size-8 bg-danger-red/90 text-white rounded-full shadow-[0_0_15px_rgba(239,68,68,0.6)] border border-white/20 flex items-center justify-center transform group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-sm">sos</span>
                        </div>
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#18181b] border border-white/10 px-2 py-1 rounded shadow-lg text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-gray-300">
                            SOS: Palasia Square
                        </div>
                    </div>

                    {/* Stats Overlay - Dark Glass */}
                    <div className="absolute top-4 left-4 hidden lg:block">
                        <div className="bg-[#18181b]/80 backdrop-blur-md p-4 rounded-xl shadow-2xl border border-white/10 w-64">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Live Status</h3>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="size-2.5 rounded-full bg-danger-red animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                                <span className="text-sm font-bold text-gray-200">4 Active Incidents</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="size-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(109,40,217,0.8)]"></div>
                                <span className="text-sm font-medium text-gray-400">12 Guardians Deployed</span>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Overlay - Dark Glass */}
                    <div className="absolute bottom-6 right-6 z-10 pointer-events-none">
                        <div className="bg-[#18181b]/80 backdrop-blur-md rounded-lg shadow-2xl p-3 pointer-events-auto flex gap-6 items-center border border-white/10">
                            <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full bg-danger-red border border-white/10 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
                                <span className="text-xs font-bold text-gray-300">Critical</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full bg-risk-amber border border-white/10 shadow-[0_0_8px_rgba(234,88,12,0.6)]"></span>
                                <span className="text-xs font-bold text-gray-300">Warning</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full bg-primary border border-white/10 shadow-[0_0_8px_rgba(109,40,217,0.6)]"></span>
                                <span className="text-xs font-bold text-gray-300">Active Unit</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Left Sidebar - Command Oversight (Dark) */}
                <aside className={`
                    fixed inset-y-0 left-0 z-50 w-[85%] max-w-[320px] 
                    flex flex-col bg-[#18181b] border-r border-white/10 shadow-2xl 
                    transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
                    lg:relative lg:translate-x-0 lg:w-[280px] lg:flex lg:z-10
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                `}>
                    {/* Mobile Header */}
                    <div className="lg:hidden px-6 py-4 border-b border-white/10 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-white">Command Control</h2>
                        <button onClick={() => setIsSidebarOpen(false)} className="p-1 text-gray-400 hover:text-white transition-colors">
                            <span className="material-symbols-outlined">chevron_left</span>
                        </button>
                    </div>

                    {/* Desktop Header (Visual only) */}
                    <div className="hidden lg:block px-6 py-4 border-b border-white/10">
                        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Live Oversight</h2>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32 scrollbar-hide">

                        {/* 1. Active Sessions - Dark Card */}
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10 shadow-lg">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-bold text-gray-400 uppercase">Active Sessions</span>
                                <span className="bg-primary/20 text-primary-light text-xs font-bold px-2 py-0.5 rounded border border-primary/30 shadow-[0_0_10px_rgba(109,40,217,0.2)]">8 LIVE</span>
                            </div>
                            <div className="space-y-3">
                                {[
                                    { id: "S-102", type: "SOS", time: "2m", loc: "Palasia Sq" },
                                    { id: "S-104", type: "Escort", time: "12m", loc: "Vijay Ngr" },
                                    { id: "S-105", type: "Monitor", time: "24m", loc: "Bhawarkua" },
                                ].map((s, i) => (
                                    <div key={i} className="flex items-center justify-between group cursor-pointer hover:bg-white/5 p-2 rounded transition-colors -mx-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${s.type === 'SOS' ? 'bg-danger-red animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-primary shadow-[0_0_8px_rgba(109,40,217,0.8)]'}`}></div>
                                            <span className="text-sm font-bold text-gray-300 group-hover:text-white transition-colors">{s.id}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${s.type === 'SOS' ? 'bg-danger-red/10 text-danger-red border-danger-red/20' : 'bg-white/5 text-gray-400 border-white/5'}`}>{s.type}</span>
                                            <span className="text-[10px] text-gray-500 ml-2 font-mono">{s.time}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 2. Guardian Fleet Status - Dark Grid */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-bold text-gray-500 uppercase">Fleet Status</span>
                                <span className="text-xs font-bold text-gray-400">24 Total</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-safe-green/10 p-2 rounded border border-safe-green/20 text-center shadow-[inset_0_0_10px_rgba(16,185,129,0.1)]">
                                    <span className="block text-lg font-bold text-safe-green">14</span>
                                    <span className="text-[10px] font-bold text-safe-green/80 uppercase">Online</span>
                                </div>
                                <div className="bg-orange-500/10 p-2 rounded border border-orange-500/20 text-center shadow-[inset_0_0_10px_rgba(249,115,22,0.1)]">
                                    <span className="block text-lg font-bold text-orange-500">6</span>
                                    <span className="text-[10px] font-bold text-orange-500/80 uppercase">Busy</span>
                                </div>
                                <div className="bg-white/5 p-2 rounded border border-white/10 text-center">
                                    <span className="block text-lg font-bold text-gray-500">4</span>
                                    <span className="text-[10px] font-bold text-gray-600 uppercase">Off</span>
                                </div>
                            </div>
                        </div>

                        {/* 3. Heatmap Toggle - Dark Card */}
                        <div className="bg-gradient-to-br from-gray-800 to-gray-900 text-white rounded-xl p-4 shadow-xl border border-white/10 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-orange-500/5 group-hover:bg-orange-500/10 transition-colors"></div>
                            <div className="flex items-center justify-between mb-2 relative z-10">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]">local_fire_department</span>
                                    <span className="text-sm font-bold text-gray-200">Risk Heatmap</span>
                                </div>
                                <div className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" defaultChecked className="sr-only peer" />
                                    <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500 shadow-inner"></div>
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-400 leading-tight relative z-10">
                                Visualizing high-density historical incident data for resource allocation.
                            </p>
                        </div>

                    </div>

                    <div className="p-6 border-t border-white/10">
                        <button className="w-full bg-primary/20 hover:bg-primary/30 text-white font-bold py-3 rounded-xl transition-all border border-primary/30 shadow-[0_0_20px_rgba(109,40,217,0.2)] flex items-center justify-center gap-2 active:scale-[0.98]">
                            <span className="material-symbols-outlined">analytics</span> Generate Report
                        </button>
                    </div>
                </aside>

            </main>
        </div>
    );
};
