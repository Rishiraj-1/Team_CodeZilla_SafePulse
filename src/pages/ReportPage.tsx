import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { addReport, ReportCategory } from '../services/reportService';
import { getUserLocation } from '../services/mapService';
import { useAuth } from '../context/AuthContext';
import { AuthorityTriagePage } from './AuthorityTriagePage';

const API_URL = import.meta.env.VITE_API_URL ?? '';

const CATEGORIES: { label: ReportCategory, icon: string }[] = [
    { label: 'Poor Lighting', icon: 'lightbulb' },
    { label: 'Suspicious Loitering', icon: 'person_search' },
    { label: 'Verbal Harassment', icon: 'record_voice_over' },
    { label: 'Physical Threat', icon: 'warning' },
    { label: 'Abandoned/Dark Area', icon: 'domain_disabled' },
    { label: 'Unsafe Crowd Behavior', icon: 'groups' }
];

// Simple device ID generation for demo purposes
const getDeviceId = () => {
    let id = localStorage.getItem('sp_device_id');
    if (!id) {
        id = `dev_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem('sp_device_id', id);
    }
    return id;
};

// We receive context from GlobalLayout but it might be untyped here
interface LayoutContext {
    mapMode: string;
    setMapMode: (mode: string) => void;
    clickedLocation?: [number, number] | null;
}

export const ReportPage: React.FC = () => {
    const { setMapMode, clickedLocation } = useOutletContext<LayoutContext>();

    const [selectedLoc, setSelectedLoc] = useState<[number, number] | null>(null);
    const [category, setCategory] = useState<ReportCategory | null>(null);
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<'selecting' | 'form' | 'submitting' | 'success'>('selecting');

    const { user } = useAuth();
    const isAuthority = user?.role === 'authority' || user?.role === 'admin';

    const DEFAULT_LOC: [number, number] = [73.4068, 18.7537]; // Lonavala center fallback

    useEffect(() => {
        setMapMode('report');
        // Use GPS if available, fall back to map center so submit always works
        getUserLocation()
            .then(loc => setSelectedLoc(loc))
            .catch(() => setSelectedLoc(DEFAULT_LOC)); // fallback on denied

        return () => {
            setMapMode('default');
        };
    }, [setMapMode]);

    // Update location if user tapped map
    useEffect(() => {
        if (clickedLocation) setSelectedLoc(clickedLocation);
    }, [clickedLocation]);

    const handleSubmit = async () => {
        if (!category) return;
        const loc = selectedLoc ?? DEFAULT_LOC; // always have a location
        setStatus('submitting');

        try {
            const token = localStorage.getItem('safepulse_auth_token');

            // 1. Post to backend (persistent, verified pipeline)
            if (token) {
                const res = await fetch(`${API_URL}/api/reports`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        category,
                        description: description.trim() || undefined,
                        latitude: loc[1],
                        longitude: loc[0],
                    }),
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.detail || 'Failed to submit report');
                }
            }

            // 2. Also record locally for instant zone-status computation
            addReport({
                category,
                coordinates: loc,
                deviceId: getDeviceId(),
                hasImage: false,
                description: description.trim() || undefined,
            });

            setTimeout(() => setStatus('success'), 600);
        } catch (e: any) {
            alert(e.message);
            setStatus('selecting');
        }
    };


    if (isAuthority) {
        return <AuthorityTriagePage />;
    }

    return (
        <div className="absolute inset-0 z-20 pointer-events-none flex items-end justify-center pb-20 sm:pb-8">
            <AnimatePresence mode="wait">
                {status === 'selecting' && (
                    <motion.div
                        key="selecting"
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                        className="pointer-events-auto bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/10 p-5 rounded-2xl w-[90%] max-w-sm flex flex-col gap-4 shadow-2xl relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500/50 to-transparent blur-sm"></div>
                        <h2 className="text-white text-lg font-bold">Report an Incident</h2>
                        <p className="text-white/60 text-sm">We've pinned your current location. Tap the "Continue" to proceed, or move map if we support clicking soon.</p>

                        <div className="flex w-full mt-2">
                            <button onClick={() => setStatus('form')} className="flex-1 w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-xl transition-all">Continue</button>
                        </div>
                    </motion.div>
                )}

                {status === 'form' && (
                    <motion.div
                        key="form"
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                        className="pointer-events-auto bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/10 p-5 rounded-3xl w-[95%] max-w-[420px] shadow-2xl flex flex-col gap-5 max-h-[80vh] overflow-y-auto"
                    >
                        <div>
                            <h2 className="text-white text-xl font-bold">What's happening?</h2>
                            <p className="text-white/50 text-xs mt-1">Select the type of risk. Precise data saves lives.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.label}
                                    onClick={() => setCategory(cat.label)}
                                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${category === cat.label ? 'bg-rose-500/20 border-rose-500/50 text-rose-400' : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10'}`}
                                >
                                    <span className="material-symbols-outlined text-2xl">{cat.icon}</span>
                                    <span className="text-[10px] font-semibold text-center leading-tight uppercase tracking-wider">{cat.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-1">Optional Details</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                maxLength={150}
                                placeholder="E.g. Group of men blocking the alleyway (Max 150 chars)"
                                className="bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-rose-500/50 resize-none h-20"
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setStatus('selecting')} className="px-5 py-3 rounded-xl text-white/50 hover:bg-white/5 font-semibold text-sm transition-all">Back</button>
                            <button
                                disabled={!category}
                                onClick={handleSubmit}
                                className={`flex-1 flex justify-center items-center gap-2 ${category ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]' : 'bg-white/10 text-white/30'} py-3 rounded-xl font-bold transition-all`}
                            >
                                <span className="material-symbols-outlined">add_alert</span>
                                Submit Report
                            </button>
                        </div>
                    </motion.div>
                )}

                {status === 'success' && (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        className="pointer-events-auto bg-[#0a0a0a]/90 backdrop-blur-xl border border-green-500/30 p-8 rounded-3xl w-[90%] max-w-sm flex flex-col items-center gap-4 text-center shadow-[0_0_40px_rgba(16,185,129,0.2)]"
                    >
                        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 mb-2">
                            <span className="material-symbols-outlined text-4xl">check_circle</span>
                        </div>
                        <div>
                            <h2 className="text-white text-xl font-bold">Report Secured</h2>
                            <p className="text-white/60 text-sm mt-2 leading-relaxed">Your report is logged. Once we verify via crowd consensus, the zone will map automatically.</p>
                        </div>
                        <button onClick={() => { setStatus('selecting'); setCategory(null); setDescription(''); }} className="mt-4 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all w-full">Got it</button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
