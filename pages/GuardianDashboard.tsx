
import React, { useState } from 'react';
import { ViewState } from '../types';

interface GuardianDashboardProps {
    setView: (view: ViewState) => void;
}

export const GuardianDashboard: React.FC<GuardianDashboardProps> = ({ setView }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="bg-background-dark text-white font-sans h-screen flex flex-col overflow-hidden relative selection:bg-primary/20">

            {/* MOBILE MENU CHECKBOX / BACKDROP */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 lg:hidden animate-in fade-in duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            {/* Header - Operational Dark Theme */}
            <header className="hidden lg:flex items-center justify-between px-6 py-4 bg-[#18181b] border-b border-white/10 h-16 shrink-0 z-20 shadow-md">
                <div className="flex items-center gap-4">
                    <div className="size-8 bg-primary/20 text-primary rounded-lg flex items-center justify-center border border-primary/20 shadow-glow">
                        <span className="material-symbols-outlined text-[20px]">security</span>
                    </div>
                    <div>
                        <h1 className="text-sm font-bold tracking-tight text-white uppercase leading-none">SafePulse <span className="text-gray-500 font-normal">Guardian</span></h1>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">UNIT: ALPHA-04 • ACTIVE</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
                        <div className="h-2 w-2 rounded-full bg-safe-green shadow-[0_0_8px_rgba(46,204,113,0.6)] animate-pulse"></div>
                        <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">Online</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="size-9 rounded-full hover:bg-white/5 border border-transparent hover:border-white/10 flex items-center justify-center text-gray-400 transition-colors">
                            <span className="material-symbols-outlined text-[20px]">notifications</span>
                        </button>
                        <div className="size-9 rounded-full bg-gray-700 bg-[url('https://lh3.googleusercontent.com/aida-public/AB6AXuAEMNTBswImIxIGOvtH1Qe0iFQABJKhhvTtjpLb-dcEsFHnuZrN53scnf5fobLnJXDWqKwiSgpmE1IzPRNL7FuMa21s737h6JnXXO1IjX4rG7LjUU63MV-i4TAkrI04liJbhAWjTRzkvdxp9hmFfwGfr6_cJneR21Fq6ZO8wHDL7HHOyJNJ7E6bcNxt0cLbpj3N4vMlSV28iMOukmdpfZduLgo2W8Grim72NSDoPt7PsRgf9rtNhjWlWxbaNNYilk8GRsSQQaWFO7k')] bg-cover bg-center border border-white/20"></div>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative">

                {/* MOBILE ONLY: Status Toggle */}
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="lg:hidden absolute top-4 left-4 z-30 bg-[#121212] text-white p-2.5 rounded-xl shadow-lg border border-white/10 flex items-center gap-2 active:scale-95 transition-transform"
                >
                    <span className="material-symbols-outlined text-[20px]">menu</span>
                    <div className="flex flex-col items-start leading-none">
                        <span className="text-[10px] font-bold text-primary uppercase">ALPHA-04</span>
                        <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">ACTIVE</span>
                    </div>
                </button>

                {/* Sidebar - Request Management */}
                <aside className={`
                    fixed inset-y-0 left-0 z-50 w-[85%] max-w-[320px] 
                    flex flex-col bg-[#18181b] border-r border-white/10 shadow-2xl 
                    transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
                    lg:relative lg:translate-x-0 lg:w-[320px] lg:flex
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                `}>
                    {/* Header */}
                    <div className="px-5 py-4 border-b border-white/10 flex justify-between items-center bg-[#18181b]">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Incoming Feed</h2>
                            <span className="bg-danger-red/20 text-danger-red text-[9px] font-bold px-1.5 py-0.5 rounded border border-danger-red/20">2 REQ</span>
                        </div>
                        <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-white transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">

                        {/* Status Card */}
                        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] font-bold text-gray-500 uppercase">Current Status</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" defaultChecked className="sr-only peer" />
                                    <div className="w-8 h-4 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-safe-green"></div>
                                </label>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined text-xl">near_me</span>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">Palasia Sector</p>
                                    <p className="text-[10px] text-gray-500">Patrol Active • 2h 14m</p>
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-white/10 w-full"></div>

                        {/* Request Card 1 (SOS) */}
                        <div className="bg-[#27272a] rounded-xl overflow-hidden border border-danger-red/30 shadow-lg relative group transition-all hover:bg-[#27272a]/80">
                            <div className="absolute top-0 left-0 w-1 h-full bg-danger-red"></div>
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex gap-3">
                                        <div className="size-10 rounded-full bg-gray-700 bg-cover bg-center border border-white/10 bg-[url('https://lh3.googleusercontent.com/aida-public/AB6AXuDinqVfRAz5z5Tc7BcjLQuzclTTJTlZwdT6wp2CcDZJqMdzvN_7q-nESHI7afjWO4980gNLEQsUdx-_xWfh3IKyo44018WtBfXz43LihQnvs4vlPyc6UV2X-JgYQ47MfyFAtPS1XHo3bgL8-TwT26Mj6gzCLrgfaexzOJ63B-xSc4qc0Z1-ILwWrwc3UC0B6awIg3jJ_vXX7h3B_fCuPxQ9HC1mhLZkld5zX3o8DChEpydDYukSK3SRjvOMqg4J1bvb32SIlsCuioI')]"></div>
                                        <div>
                                            <h3 className="text-sm font-bold text-white">Anjali Sharma</h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[9px] font-bold text-danger-red uppercase tracking-wider bg-danger-red/10 px-1.5 py-px rounded">SOS Signal</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-lg font-bold text-white leading-none">0.8<span className="text-[10px] font-normal text-gray-500 ml-0.5">km</span></span>
                                        <span className="text-[9px] text-gray-500 font-mono">T+2m</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 mb-4 p-2 rounded bg-black/20 border border-white/5">
                                    <span className="material-symbols-outlined text-gray-500 text-sm">location_on</span>
                                    <span className="text-[10px] text-gray-300 font-mono truncate">Palasia Sq, Near Starbucks</span>
                                </div>

                                <div className="flex gap-2">
                                    <button className="flex-1 py-2 text-[10px] font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors border border-white/5">
                                        DECLINE
                                    </button>
                                    <button className="flex-[2] py-2 text-[10px] font-bold text-white bg-primary hover:bg-primary-dark rounded shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all active:scale-95">
                                        <span className="material-symbols-outlined text-[14px]">navigation</span> ACCEPT
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Request Card 2 (Standard) */}
                        <div className="bg-[#27272a] rounded-xl overflow-hidden border border-white/10 shadow-sm relative group transition-all hover:bg-[#27272a]/80">
                            <div className="absolute top-0 left-0 w-1 h-full bg-risk-amber"></div>
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex gap-3">
                                        <div className="size-10 rounded-full bg-gray-700 bg-cover bg-center border border-white/10 bg-[url('https://lh3.googleusercontent.com/aida-public/AB6AXuAnrUjzK98h9R85tFUKGnuviA1xY8pXegYa3n6aCiOtWnBPu63hpGoAjz29CoRizQ6i4nTgn7p9hdgyClN5NGmvtqZfuQG7UN9v0oT33nPiW7L-gJExjark_N3THLGi-sG17y4da2oriSviTHiyoUURkm7e7vt-MfO_H_7CBLsQA1BZJoKoiopQqgKbutadjlkVlYHwgbRlkHeX-9fNVUgx8MNUAtKoFUKfzNGCnK2wTITEawyeRY5vHHGgGLn7CLTfVgnhT2a1VjY')]"></div>
                                        <div>
                                            <h3 className="text-sm font-bold text-white">Rahul Verma</h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[9px] font-bold text-risk-amber uppercase tracking-wider">Escort Req</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-lg font-bold text-white leading-none">1.2<span className="text-[10px] font-normal text-gray-500 ml-0.5">km</span></span>
                                    </div>
                                </div>
                                <button className="w-full py-2 text-[10px] font-bold text-primary border border-primary/30 hover:bg-primary/10 rounded transition-colors">
                                    VIEW DETAILS
                                </button>
                            </div>
                        </div>

                    </div>
                </aside>

                {/* Map Area - Light Map for contrast with Dark UI */}
                <main className="flex-1 relative bg-gray-100">
                    <div className="absolute inset-0 bg-cover bg-center opacity-80" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBbHn7dZ_P7UaOJKM-ZHcoe2vN2wsgv7vpjg3VvYfeRf8be555nqWPkTzkrl8YRRjixTfCO0AMwNVnN52C9eI9N-Pl26FNMIaHGLBlRKXtSCx0xtkbKC16YTw5ZZlaR29tAhdwB6GVZ8pMelGP4maJfNkWqdu3WifyLQtI8wC4hQXFsGiL_bD37gohm5Fzro2N1IY-ljXhPilxV9JYI8GMIrJTjAx3JQMrTUdzmcG_IEOBuOy-5HV-LqHl0-x90QytXYzthhKe3pY0')" }}></div>

                    {/* Dark Vignette Overlay for focus */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#18181b]/40 to-transparent pointer-events-none"></div>

                    {/* Active Route Visual */}
                    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
                        <path d="M 400 300 Q 500 400 600 350" stroke="#b787f5" strokeWidth="4" fill="none" strokeDasharray="8 4" className="opacity-60" />
                        <circle cx="600" cy="350" r="4" fill="#b787f5" />
                    </svg>

                    {/* SOS Marker */}
                    <div className="absolute top-[35%] left-[45%] pointer-events-auto cursor-pointer group">
                        <div className="size-16 rounded-full bg-danger-red/20 animate-ping absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
                        <div className="relative size-10 bg-danger-red rounded-full border-2 border-white shadow-xl flex items-center justify-center z-10">
                            <span className="material-symbols-outlined text-white">sos</span>
                        </div>
                        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white text-charcoal px-2 py-1 rounded shadow-lg text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            SOS: Anjali S.
                        </div>
                    </div>

                    {/* My Location */}
                    <div className="absolute bottom-[40%] left-[30%] pointer-events-none">
                        <div className="relative size-4 bg-primary rounded-full ring-4 ring-white shadow-xl"></div>
                    </div>

                </main>
            </div >
        </div >
    );
};