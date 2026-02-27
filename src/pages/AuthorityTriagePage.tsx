/**
 * AuthorityTriagePage
 *
 * Shown to AUTHORITY users instead of the citizen report form.
 * Fetches pending reports assigned to this authority, ordered HIGH first.
 * Accept → creates a risk zone on the backend + re-fetches zones on map.
 * Reject → marks report rejected, no zone created.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL ?? '';

interface PendingReport {
    id: string;
    reporter_role: string;       // CITIZEN | GUARDIAN
    category: string;
    description?: string;
    latitude: number;
    longitude: number;
    priority: string;            // NORMAL | HIGH
    status: string;
    created_at: string;
    reporter_name?: string;
}

interface ActionState {
    [reportId: string]: 'loading' | 'accepted' | 'rejected' | null;
}

const timeAgo = (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
};

const categoryIcon: Record<string, string> = {
    'Poor Lighting': 'lightbulb',
    'Suspicious Loitering': 'person_search',
    'Verbal Harassment': 'record_voice_over',
    'Physical Threat': 'warning',
    'Abandoned/Dark Area': 'domain_disabled',
    'Unsafe Crowd Behavior': 'groups',
};

export const AuthorityTriagePage: React.FC = () => {
    const [reports, setReports] = useState<PendingReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionState, setActionState] = useState<ActionState>({});

    const token = localStorage.getItem('safepulse_auth_token');

    const fetchPending = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/api/reports/pending`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setReports(data);
        } catch (e: any) {
            setError('Failed to load pending reports');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchPending();
        const interval = setInterval(fetchPending, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, [fetchPending]);

    const handleAction = async (id: string, action: 'accept' | 'reject') => {
        setActionState(s => ({ ...s, [id]: 'loading' }));
        try {
            const res = await fetch(`${API_URL}/api/reports/${id}/${action}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            setActionState(s => ({ ...s, [id]: action === 'accept' ? 'accepted' : 'rejected' }));
            // Remove from list after short delay
            setTimeout(() => {
                setReports(prev => prev.filter(r => r.id !== id));
                setActionState(s => { const c = { ...s }; delete c[id]; return c; });
            }, 1500);
        } catch {
            setActionState(s => ({ ...s, [id]: null }));
        }
    };

    return (
        <div className="absolute inset-0 z-20 pointer-events-none flex flex-col">
            {/* Panel */}
            <div className="pointer-events-auto absolute top-20 right-4 lg:right-6 w-[340px] max-h-[calc(100vh-120px)] flex flex-col gap-3 z-30">

                {/* Header */}
                <div className="glass-panel p-4 rounded-2xl flex items-center justify-between">
                    <div>
                        <span className="text-[9px] font-bold tracking-[0.25em] text-white/40 uppercase">Authority Console</span>
                        <h2 className="text-white font-semibold text-sm mt-0.5">Pending Reports</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        {reports.length > 0 && (
                            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                {reports.length} pending
                            </span>
                        )}
                        <button
                            onClick={fetchPending}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[14px] text-white/50">refresh</span>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex flex-col gap-3 overflow-y-auto pr-1 flex-1">
                    {loading && (
                        <div className="glass-panel p-6 rounded-2xl flex items-center justify-center gap-3">
                            <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                            <span className="text-white/40 text-xs">Loading reports…</span>
                        </div>
                    )}

                    {!loading && error && (
                        <div className="glass-panel p-4 rounded-2xl text-rose-400 text-sm text-center border border-rose-500/20">
                            {error}
                        </div>
                    )}

                    {!loading && !error && reports.length === 0 && (
                        <div className="glass-panel p-8 rounded-2xl flex flex-col items-center gap-3 text-center">
                            <span className="material-symbols-outlined text-[32px] text-white/20">check_circle</span>
                            <p className="text-white/40 text-sm">No pending reports</p>
                            <p className="text-white/20 text-[11px]">Your zone is clear</p>
                        </div>
                    )}

                    <AnimatePresence>
                        {reports.map((report) => {
                            const aState = actionState[report.id];
                            const isHigh = report.priority === 'HIGH';

                            return (
                                <motion.div
                                    key={report.id}
                                    layout
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: 40 }}
                                    className={`glass-panel rounded-2xl overflow-hidden border ${isHigh ? 'border-red-500/30' : 'border-amber-500/20'
                                        }`}
                                >
                                    {/* Priority stripe */}
                                    <div className={`h-0.5 w-full ${isHigh ? 'bg-red-500' : 'bg-amber-400'}`} />

                                    <div className="p-4 flex flex-col gap-3">
                                        {/* Top row */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[18px] text-white/40">
                                                    {categoryIcon[report.category] || 'report'}
                                                </span>
                                                <span className="text-white text-[12px] font-semibold leading-tight">
                                                    {report.category}
                                                </span>
                                            </div>
                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${isHigh
                                                ? 'bg-red-500/20 text-red-400 border-red-500/40'
                                                : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                                }`}>
                                                {isHigh ? '🔴 HIGH' : '🟡 NORMAL'}
                                            </span>
                                        </div>

                                        {/* Reporter info */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-white/50 text-[10px]">
                                                <span className="material-symbols-outlined text-[12px]">
                                                    {report.reporter_role === 'GUARDIAN' ? 'shield_person' : 'person'}
                                                </span>
                                                <span>
                                                    Submitted by <strong className="text-white/70">
                                                        {report.reporter_role === 'GUARDIAN' ? 'Guardian' : 'Citizen'}
                                                    </strong>
                                                    {report.reporter_name ? ` · ${report.reporter_name}` : ''}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-white/30">{timeAgo(report.created_at)}</span>
                                        </div>

                                        {/* Description */}
                                        {report.description && (
                                            <p className="text-[11px] text-white/50 leading-relaxed bg-white/5 rounded-xl px-3 py-2">
                                                "{report.description}"
                                            </p>
                                        )}

                                        {/* Location */}
                                        <div className="flex items-center gap-1.5 text-[10px] text-white/30">
                                            <span className="material-symbols-outlined text-[12px]">location_on</span>
                                            <span>{report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}</span>
                                        </div>

                                        {/* Action buttons or result */}
                                        {aState === 'accepted' && (
                                            <div className="flex items-center gap-2 text-green-400 text-[11px] font-semibold">
                                                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                                Risk Zone Created
                                            </div>
                                        )}
                                        {aState === 'rejected' && (
                                            <div className="flex items-center gap-2 text-white/30 text-[11px] font-semibold">
                                                <span className="material-symbols-outlined text-[16px]">cancel</span>
                                                Report Rejected
                                            </div>
                                        )}
                                        {aState !== 'accepted' && aState !== 'rejected' && (
                                            <div className="flex gap-2 pt-1">
                                                <motion.button
                                                    whileTap={{ scale: 0.96 }}
                                                    disabled={aState === 'loading'}
                                                    onClick={() => handleAction(report.id, 'reject')}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 text-[10px] font-semibold uppercase tracking-wider transition-all disabled:opacity-40"
                                                >
                                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                                    Reject
                                                </motion.button>
                                                <motion.button
                                                    whileTap={{ scale: 0.96 }}
                                                    disabled={aState === 'loading'}
                                                    onClick={() => handleAction(report.id, 'accept')}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 hover:bg-rose-500/30 text-[10px] font-semibold uppercase tracking-wider transition-all disabled:opacity-40"
                                                >
                                                    {aState === 'loading'
                                                        ? <span className="w-3 h-3 rounded-full border-2 border-rose-400/30 border-t-rose-400 animate-spin" />
                                                        : <span className="material-symbols-outlined text-[14px]">check</span>
                                                    }
                                                    Accept
                                                </motion.button>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};
