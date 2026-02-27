import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import mapboxgl from 'mapbox-gl';

const API_URL = import.meta.env.VITE_API_URL ?? '';

export const AuthorityDashboard: React.FC = () => {
    const { setMapMode } = useOutletContext<any>();
    const navigate = useNavigate();

    const [stats, setStats] = useState({
        activeSos: 2,
        pendingReports: 0, // start at 0, fetch immediately
        activeZones: 12,
        onlineGuardians: 8
    });

    const mapInstance = (window as any).mapboxMapInstance as mapboxgl.Map;
    const markersRef = useRef<mapboxgl.Marker[]>([]);

    useEffect(() => {
        setMapMode('default');

        const fetchPendingCount = async () => {
            try {
                const token = localStorage.getItem('safepulse_auth_token');
                const res = await fetch(`${API_URL}/api/reports/pending`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setStats(s => ({ ...s, pendingReports: data.length }));
                }
            } catch (err) {
                console.error("Failed to fetch pending reports count", err);
            }
        };
        fetchPendingCount();

        return () => {
            markersRef.current.forEach(m => m.remove());
        };
    }, [setMapMode]);

    useEffect(() => {
        if (!mapInstance) return;

        // Cleanup
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];

        // Draw Mock Active SOS
        const sosCoords = [[73.4068, 18.7537], [73.4200, 18.7650]];
        sosCoords.forEach(c => {
            const el = document.createElement('div');
            el.className = 'w-6 h-6 bg-red-500 rounded-full flex justify-center items-center shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse';
            markersRef.current.push(new mapboxgl.Marker({ element: el }).setLngLat(c as any).addTo(mapInstance));
        });

        // Draw Mock Guardians
        const guardianCoords = [[73.4090, 18.7545], [73.4040, 18.7525], [73.4300, 18.7750], [73.3980, 18.7400]];
        guardianCoords.forEach(c => {
            const el = document.createElement('div');
            el.className = 'w-3 h-3 bg-green-500 border border-white rounded-full shadow-lg';
            markersRef.current.push(new mapboxgl.Marker({ element: el }).setLngLat(c as any).addTo(mapInstance));
        });

        // Fit bounds gently to center
        mapInstance.flyTo({ center: [73.4068, 18.7537], zoom: 13, duration: 1500 });
    }, [mapInstance]);

    return (
        <div className="absolute inset-0 pointer-events-none z-20 flex flex-col p-4 pt-24 sm:p-6 sm:pt-28 lg:p-8 lg:pt-32">

            {/* Top Overview Cards */}
            <div className="pointer-events-auto grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-6xl mx-auto mb-auto bg-[#0a0a0a]/40 p-4 rounded-3xl backdrop-blur-md border border-white/5">

                <motion.div
                    whileHover={{ scale: 1.02 }}
                    onClick={() => navigate('/app/sos-alerts')}
                    className="glass-panel p-5 rounded-2xl border border-red-500/30 flex flex-col gap-2 cursor-pointer relative overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-red-500/5 group-hover:bg-red-500/10 transition-colors"></div>
                    <div className="flex items-center justify-between z-10">
                        <span className="material-symbols-outlined text-red-400">emergency</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-500/10 px-2 py-0.5 rounded-sm animate-pulse">Critical</span>
                    </div>
                    <div className="z-10 mt-2">
                        <h2 className="text-3xl font-black text-white">{stats.activeSos}</h2>
                        <p className="text-xs uppercase tracking-widest font-bold text-white/50 mt-1">Active SOS</p>
                    </div>
                </motion.div>

                <motion.div
                    whileHover={{ scale: 1.02 }}
                    onClick={() => navigate('/app/report')}
                    className="glass-panel p-5 rounded-2xl border border-amber-500/30 flex flex-col gap-2 cursor-pointer relative overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-amber-500/5 group-hover:bg-amber-500/10 transition-colors"></div>
                    <div className="flex items-center justify-between z-10">
                        <span className="material-symbols-outlined text-amber-500">pending_actions</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-sm">Requires Action</span>
                    </div>
                    <div className="z-10 mt-2">
                        <h2 className="text-3xl font-black text-white">{stats.pendingReports}</h2>
                        <p className="text-xs uppercase tracking-widest font-bold text-white/50 mt-1">Pending Reports</p>
                    </div>
                </motion.div>

                <motion.div
                    whileHover={{ scale: 1.02 }}
                    onClick={() => navigate('/app/risk-zones')}
                    className="glass-panel p-5 rounded-2xl border border-rose-500/30 flex flex-col gap-2 cursor-pointer relative overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-rose-500/5 group-hover:bg-rose-500/10 transition-colors"></div>
                    <div className="flex items-center justify-between z-10">
                        <span className="material-symbols-outlined text-rose-400">radar</span>
                    </div>
                    <div className="z-10 mt-2">
                        <h2 className="text-3xl font-black text-white">{stats.activeZones}</h2>
                        <p className="text-xs uppercase tracking-widest font-bold text-white/50 mt-1">Verified Zones</p>
                    </div>
                </motion.div>

                <motion.div
                    whileHover={{ scale: 1.02 }}
                    onClick={() => navigate('/app/users')}
                    className="glass-panel p-5 rounded-2xl border border-green-500/30 flex flex-col gap-2 cursor-pointer relative overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-green-500/5 group-hover:bg-green-500/10 transition-colors"></div>
                    <div className="flex items-center justify-between z-10">
                        <span className="material-symbols-outlined text-green-400">shield_person</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-green-400 bg-green-500/10 px-2 py-0.5 rounded-sm">Deployed</span>
                    </div>
                    <div className="z-10 mt-2">
                        <h2 className="text-3xl font-black text-white">{stats.onlineGuardians}</h2>
                        <p className="text-xs uppercase tracking-widest font-bold text-white/50 mt-1">Online Guardians</p>
                    </div>
                </motion.div>

            </div>

            {/* Floating Action / Logs panel (Optional Context) */}
            <div className="pointer-events-auto mt-auto self-end w-[350px] glass-panel bg-[#0a0a0a]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 shadow-2xl">
                <h3 className="text-xs uppercase font-bold tracking-widest text-white/40 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    Live Dispatch Feed
                </h3>
                <div className="flex flex-col gap-3 text-sm">
                    <div className="flex items-start gap-3 border-b border-white/5 pb-3">
                        <span className="material-symbols-outlined text-rose-500 text-lg mt-0.5">warning</span>
                        <div>
                            <p className="text-white/80 font-medium leading-tight">New Zone Identified <span className="text-rose-400">High Risk</span></p>
                            <span className="text-[10px] text-white/40">2 mins ago · Vijay Nagar area</span>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 border-b border-white/5 pb-3">
                        <span className="material-symbols-outlined text-green-500 text-lg mt-0.5">verified_user</span>
                        <div>
                            <p className="text-white/80 font-medium leading-tight">Guardian <span className="text-green-400">G-042</span> En Route</p>
                            <span className="text-[10px] text-white/40">4 mins ago · Responding to SOS-123</span>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-amber-500 text-lg mt-0.5">gavel</span>
                        <div>
                            <p className="text-white/80 font-medium leading-tight">Report #445 <span className="text-amber-400">Requires Verification</span></p>
                            <span className="text-[10px] text-white/40">12 mins ago · Suspicious Loitering</span>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};
