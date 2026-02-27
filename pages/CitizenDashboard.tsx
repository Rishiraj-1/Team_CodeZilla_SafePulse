import React, { useState } from 'react';
import { ViewState } from '../types';

interface CitizenDashboardProps {
   setView: (view: ViewState) => void;
}

export const CitizenDashboard: React.FC<CitizenDashboardProps> = ({ setView }) => {
   const [showReportModal, setShowReportModal] = useState(false);
   const [isSidebarOpen, setIsSidebarOpen] = useState(false);

   // Filter State
   const [filters, setFilters] = useState({
      safeCorridors: true,
      communityReports: true,
      policeStations: false,
   });

   const toggleFilter = (key: keyof typeof filters) => {
      setFilters(prev => ({ ...prev, [key]: !prev[key] }));
   };

   return (
      <div className="flex h-screen w-full bg-[#f4f4f5] text-charcoal font-sans overflow-hidden relative">

         {/* MOBILE OVERLAY */}
         {isSidebarOpen && (
            <div
               className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden animate-in fade-in"
               onClick={() => setIsSidebarOpen(false)}
            />
         )}

         {/* 1. LEFT SIDEBAR - DARK INTELLIGENCE PANEL */}
         <aside className={`
            fixed inset-y-0 left-0 z-50 w-80 bg-[#121212] text-white flex flex-col shadow-2xl transition-transform duration-300 ease-out
            lg:relative lg:translate-x-0 shrink-0
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
         `}>

            {/* Logo Section */}
            <div className="p-6 pb-8">
               <div className="flex items-center gap-3 mb-1">
                  <div className="size-8 bg-gradient-to-br from-primary to-primary-dark rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary/20">
                     <span className="material-symbols-outlined text-[20px]">shield_person</span>
                  </div>
                  <div>
                     <h1 className="text-lg font-bold leading-none tracking-tight">SafePulse</h1>
                     <p className="text-[9px] font-bold text-primary tracking-[0.2em] uppercase mt-0.5">Intelligence</p>
                  </div>
               </div>
            </div>

            {/* Current Zone Status */}
            <div className="px-6 mb-8">
               <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                     <span className="material-symbols-outlined text-[14px]">my_location</span>
                     Current Zone
                  </div>
                  <span className="bg-safe-green/20 text-safe-green text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                     <span className="w-1 h-1 rounded-full bg-safe-green animate-pulse"></span> LIVE
                  </span>
               </div>

               <h2 className="text-2xl font-bold text-white mb-2">Vijay Nagar</h2>

               <div className="flex items-baseline gap-3">
                  <span className="text-6xl font-black text-white tracking-tighter loading-none">88</span>
                  <div className="flex flex-col">
                     <span className="text-xs font-bold text-safe-green uppercase leading-none">Safe</span>
                     <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest leading-none mt-0.5">Index</span>
                  </div>
               </div>

               {/* Visualizer Bars */}
               <div className="flex items-end gap-[3px] h-6 mt-4 opacity-50">
                  {[40, 60, 45, 70, 50, 80, 65, 55, 45, 60, 50, 40].map((h, i) => (
                     <div key={i} className="w-1.5 bg-gray-600 rounded-t-sm" style={{ height: `${h}%` }}></div>
                  ))}
               </div>
            </div>

            {/* Search */}
            <div className="px-6 mb-8">
               <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Target Location</label>
               <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[18px]">search</span>
                  <input
                     type="text"
                     placeholder="Search areas..."
                     className="w-full bg-[#1e1e22] text-sm text-white placeholder-gray-600 rounded-xl py-3 pl-10 pr-4 border border-white/5 focus:outline-none focus:border-primary/50 transition-colors"
                  />
               </div>
            </div>

            {/* Active Filters */}
            <div className="px-6 flex-1">
               <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 block">Active Filters</label>
               <div className="space-y-3">
                  {[
                     { id: 'safeCorridors' as const, label: "Safe Corridors", color: "bg-safe-green", border: "border-safe-green" },
                     { id: 'communityReports' as const, label: "Community Reports", color: "bg-primary", border: "border-primary" },
                     { id: 'policeStations' as const, label: "Police Stations", color: "bg-blue-500", border: "border-blue-500" },
                  ].map((filter) => {
                     const isActive = filters[filter.id];
                     return (
                        <div
                           key={filter.id}
                           onClick={() => toggleFilter(filter.id)}
                           className={`flex items-center justify-between group cursor-pointer select-none transition-all duration-200 ${isActive ? 'opacity-100' : 'opacity-60 hover:opacity-80'}`}
                        >
                           <div className="flex items-center gap-3">
                              <div className={`size-4 rounded flex items-center justify-center border transition-all duration-200 ${isActive ? `bg-transparent ${filter.border}` : 'border-gray-700 bg-transparent'}`}>
                                 {isActive && <div className={`size-2 rounded-sm ${filter.color}`}></div>}
                              </div>
                              <span className={`text-sm font-medium transition-colors ${isActive ? 'text-gray-200' : 'text-gray-500'}`}>{filter.label}</span>
                           </div>
                           <div className={`size-1.5 rounded-full ${filter.color} shadow-lg transition-all duration-300 ${isActive ? `opacity-100 shadow-${filter.color}/50` : 'opacity-20 shadow-none'}`}></div>
                        </div>
                     );
                  })}
               </div>
            </div>
         </aside>

         {/* 2. MAIN MAP AREA - GRID & VISUALS */}
         <main className="flex-1 relative bg-[#d4d4d8] overflow-hidden">

            {/* Grid Pattern */}
            <div className="absolute inset-0 z-0 opacity-40 pointer-events-none"
               style={{
                  backgroundImage: 'linear-gradient(#a1a1aa 1px, transparent 1px), linear-gradient(90deg, #a1a1aa 1px, transparent 1px)',
                  backgroundSize: '40px 40px'
               }}>
            </div>
            <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-black/5"></div>

            {/* Mobile Sidebar Toggle */}
            <button
               onClick={() => setIsSidebarOpen(true)}
               className="lg:hidden absolute top-4 left-4 z-30 bg-[#121212] text-white p-2.5 rounded-xl shadow-lg border border-white/10 flex items-center gap-2 active:scale-95 transition-transform"
            >
               <span className="material-symbols-outlined text-[20px]">menu</span>
               <div className="flex flex-col items-start leading-none">
                  <span className="text-[10px] font-bold text-safe-green">88 SAFE</span>
                  <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">INDEX</span>
               </div>
            </button>

            {/* Top Right: User Profile & System Status */}
            <div className="absolute top-6 right-6 z-20 flex items-center gap-4">
               <div className="bg-[#18181b] rounded-full p-1 pl-1.5 pr-4 flex items-center gap-3 shadow-xl border border-white/10">
                  <div className="size-8 rounded-full overflow-hidden border border-white/20">
                     <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuC_iWpfJqLm4tgPtazoh4uQfDUQGFq2Zg2CVC_Sl0gdEBZ_sJgqbhTq0GUL1D8n5dILh5nPDC2a9pEEFhKsw6t3wTbQo8nW5kaW-4pbWuxgQuOIx3AEP4PjbGbrRd5lCDYQxNFrgIBa0eYkCGE-8HyiPVRjuLA2CjCpJEvKlDCz5-fZvmz4zNCjzcEvn5RqV4wi_zhsJ3dGZkRfqBcDUI45t2Da2Q77d9sDKzAV9evrPWjsnObNMmFDy87KN_YEsO4BZ2BdNBqDVus" alt="Profile" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col">
                     <span className="text-xs font-bold text-white leading-none">Sujal</span>
                  </div>
                  <div className="h-4 w-px bg-white/10 mx-1"></div>
                  <div className="flex items-center gap-1.5">
                     <span className="size-1.5 rounded-full bg-safe-green animate-pulse"></span>
                     <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">System Online</span>
                  </div>
                  <span className="material-symbols-outlined text-gray-400 text-[16px] ml-1">notifications</span>
               </div>
            </div>


            {/* Center Map Visuals */}
            <div className="absolute inset-0 flex items-center justify-center transform translate-y-[-5%] pointer-events-none">
               <div className="relative w-[600px] h-[400px]">

                  {/* Route Line (Safe Corridors) */}
                  {filters.safeCorridors && (
                     <svg className="absolute inset-0 w-full h-full overflow-visible drop-shadow-xl animate-in fade-in duration-500">
                        <path d="M 50 200 L 250 240" stroke="#10b981" strokeWidth="6" strokeLinecap="round" />
                        <path d="M 250 240 L 400 240" stroke="#f97316" strokeWidth="6" strokeLinecap="round" strokeDasharray="8 8" className="animate-pulse" />
                        <circle cx="50" cy="200" r="6" fill="#10b981" stroke="white" strokeWidth="2" />
                        <circle cx="250" cy="240" r="4" fill="#f97316" />
                     </svg>
                  )}

                  {/* Community Reports (Risk Card) */}
                  {filters.communityReports && (
                     <div className="animate-in fade-in zoom-in duration-300">
                        {/* Pop-up Card */}
                        <div className="absolute top-[180px] left-[260px] bg-[#18181b] text-white p-3 rounded-lg shadow-2xl border-l-4 border-risk-amber border-y border-r border-white/10 flex items-center gap-3 z-10">
                           <div className="bg-risk-amber/20 p-1.5 rounded text-risk-amber">
                              <span className="material-symbols-outlined text-[18px]">warning</span>
                           </div>
                           <div>
                              <h3 className="text-xs font-bold uppercase tracking-wide">Poor Lighting</h3>
                              <p className="text-[9px] font-bold text-gray-500 font-mono">DETECTED: 20:45 • <span className="text-risk-amber">HIGH RISK</span></p>
                           </div>
                        </div>

                        {/* Connector Line */}
                        <svg className="absolute top-[214px] left-[275px] w-8 h-12 overflow-visible pointer-events-none">
                           <path d="M 0 0 L 0 26" stroke="#f97316" strokeWidth="2" strokeDasharray="4 2" />
                           <circle cx="0" cy="26" r="3" fill="#f97316" />
                        </svg>

                        {/* Pulse Ring at Issue */}
                        <div className="absolute top-[240px] left-[275px] -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-risk-amber/20 rounded-full animate-ping"></div>
                     </div>
                  )}

                  {/* Police Stations (New Layer) */}
                  {filters.policeStations && (
                     <div className="absolute top-[120px] left-[400px] animate-in fade-in zoom-in duration-300 group cursor-pointer pointer-events-auto">
                        <div className="absolute -inset-2 bg-blue-500/20 rounded-full animate-pulse"></div>
                        <div className="relative size-10 bg-[#18181b] rounded-xl border border-blue-500/50 shadow-lg flex items-center justify-center text-blue-500 z-10 group-hover:scale-110 transition-transform">
                           <span className="material-symbols-outlined text-[20px]">local_police</span>
                        </div>
                        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-[#18181b] text-white text-[9px] font-bold py-1 px-2 rounded border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                           VIJAY NAGAR HQ
                        </div>
                     </div>
                  )}

               </div>
            </div>


            {/* 3. BOTTOM ACTION DOCK */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-40 flex items-center gap-3">

               {/* Main Action - Plan Route */}
               <button onClick={() => setView(ViewState.CITIZEN_SAFE_ROUTE)} className="h-14 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white pl-6 pr-4 rounded-xl shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-8 group border border-white/20">
                  <div className="flex flex-col items-start">
                     <span className="text-xs font-black uppercase tracking-widest">Plan Route</span>
                     <span className="text-[9px] font-bold text-white/60 font-mono tracking-wider">RISK-WEIGHTED</span>
                  </div>
                  <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
               </button>

               {/* Warning Button */}
               <button className="h-14 w-14 bg-[#18181b] text-gray-400 hover:text-white border border-white/10 rounded-xl flex items-center justify-center shadow-lg hover:bg-[#27272a] transition-colors">
                  <span className="material-symbols-outlined">warning</span>
               </button>

               {/* SOS Button */}
               <button onClick={() => setView(ViewState.CITIZEN_SOS)} className="h-14 w-20 bg-gradient-to-br from-red-600 to-red-700 text-white rounded-xl shadow-lg shadow-red-600/30 flex items-center justify-center hover:brightness-110 active:scale-95 transition-all">
                  <span className="text-xs font-black tracking-widest">SOS</span>
               </button>

            </div>

         </main>
      </div>
   );
};
