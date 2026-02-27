import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

const API = import.meta.env.VITE_API_URL ?? '';

export const AdminPersonnelPage: React.FC = () => {
    const { user } = useAuth();
    const [pendingAuthorities, setPendingAuthorities] = useState<any[]>([]);
    const [activeAuthorities, setActiveAuthorities] = useState<any[]>([]);
    const [pendingGuardians, setPendingGuardians] = useState<any[]>([]);
    const [activeGuardians, setActiveGuardians] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('safepulse_token');
            const { supabase } = await import('../lib/supabase');
            const { data } = await supabase.auth.getSession();
            const sessionToken = data.session?.access_token;

            const [pendingRes, activeRes, pendingGuardRes, activeGuardRes] = await Promise.all([
                fetch(`${API}/users/authorities/pending`, {
                    headers: { 'Authorization': `Bearer ${sessionToken}` }
                }),
                fetch(`${API}/users/authorities/active`, {
                    headers: { 'Authorization': `Bearer ${sessionToken}` }
                }),
                fetch(`${API}/users/guardians/pending`, {
                    headers: { 'Authorization': `Bearer ${sessionToken}` }
                }),
                fetch(`${API}/users/guardians/active`, {
                    headers: { 'Authorization': `Bearer ${sessionToken}` }
                })
            ]);

            if (pendingRes.ok) {
                const pendData = await pendingRes.json();
                setPendingAuthorities(pendData);
            }
            if (activeRes.ok) {
                const actData = await activeRes.json();
                setActiveAuthorities(actData);
            }
            if (pendingGuardRes.ok) {
                const pendGuardData = await pendingGuardRes.json();
                setPendingGuardians(pendGuardData);
            }
            if (activeGuardRes.ok) {
                const actGuardData = await activeGuardRes.json();
                setActiveGuardians(actGuardData);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAction = async (userId: string, action: 'approve' | 'reject', roleType: 'authorities' | 'guardians') => {
        try {
            const { supabase } = await import('../lib/supabase');
            const { data } = await supabase.auth.getSession();
            const sessionToken = data.session?.access_token;

            const res = await fetch(`${API}/users/${roleType}/${userId}/${action}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${sessionToken}`
                }
            });
            if (res.ok) {
                if (roleType === 'authorities') {
                    setPendingAuthorities(prev => prev.filter(u => u.id !== userId));
                } else {
                    setPendingGuardians(prev => prev.filter(u => u.id !== userId));
                }
            } else {
                alert(`Failed to ${action} ${roleType}.`);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteActive = async (userId: string, roleType: 'authorities' | 'guardians') => {
        const noun = roleType === 'authorities' ? 'Authority' : 'Guardian';
        if (!window.confirm(`Are you sure you want to permanently delete this active ${noun} account?`)) return;

        try {
            const { supabase } = await import('../lib/supabase');
            const { data } = await supabase.auth.getSession();
            const sessionToken = data.session?.access_token;

            const res = await fetch(`${API}/users/${roleType}/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${sessionToken}`
                }
            });
            if (res.ok) {
                if (roleType === 'authorities') {
                    setActiveAuthorities(prev => prev.filter(u => u.id !== userId));
                } else {
                    setActiveGuardians(prev => prev.filter(u => u.id !== userId));
                }
            } else {
                alert(`Failed to delete ${noun.toLowerCase()}.`);
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="p-10 max-w-7xl mx-auto pt-24 text-white">
            <h1 className="text-3xl font-bold mb-8">Personnel Management</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* LEFT COLUMN - Pending Applications */}
                <div className="flex flex-col gap-8">
                    <section className="glass-panel p-6 rounded-2xl h-full">
                        <h2 className="text-xl font-semibold mb-6 text-white/90">Pending Applications</h2>

                        {loading ? (
                            <div className="text-white/50">Loading applications...</div>
                        ) : (pendingAuthorities.length === 0 && pendingGuardians.length === 0) ? (
                            <div className="text-white/50 bg-white/5 p-6 rounded-xl border border-white/10 text-center">
                                No pending applications found.
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {/* pending authorities */}
                                {pendingAuthorities.length > 0 && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium text-white/70">Authorities</h3>
                                        {pendingAuthorities.map(authority => (
                                            <motion.div
                                                key={authority.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="p-4 rounded-xl border border-white/10 bg-white/5 flex flex-col xl:flex-row xl:items-center justify-between gap-4"
                                            >
                                                <div>
                                                    <div className="font-semibold text-lg">{authority.name}</div>
                                                    <div className="text-sm text-white/60">{authority.email}</div>
                                                    <div className="text-xs text-white/40 mt-1">
                                                        Applied: {new Date(authority.created_at).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleAction(authority.id, 'reject', 'authorities')}
                                                        className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 font-medium text-sm transition-colors border border-red-500/30"
                                                    >
                                                        Reject
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(authority.id, 'approve', 'authorities')}
                                                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 font-medium text-sm transition-colors border border-emerald-500/30"
                                                    >
                                                        Approve
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}

                                {/* pending guardians */}
                                {pendingGuardians.length > 0 && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium text-white/70">Guardians</h3>
                                        {pendingGuardians.map(guardian => (
                                            <motion.div
                                                key={guardian.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="p-4 rounded-xl border border-white/10 bg-white/5 flex flex-col xl:flex-row xl:items-center justify-between gap-4"
                                            >
                                                <div>
                                                    <div className="font-semibold text-lg">{guardian.name}</div>
                                                    <div className="text-sm text-white/60">{guardian.email}</div>
                                                    <div className="text-xs text-white/40 mt-1">
                                                        Applied: {new Date(guardian.created_at).toLocaleDateString()}
                                                    </div>
                                                    {guardian.category && (
                                                        <div className="text-xs mt-1 inline-block px-2 py-1 rounded bg-white/10 text-white/80">
                                                            {guardian.category}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleAction(guardian.id, 'reject', 'guardians')}
                                                        className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 font-medium text-sm transition-colors border border-red-500/30"
                                                    >
                                                        Reject
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(guardian.id, 'approve', 'guardians')}
                                                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 font-medium text-sm transition-colors border border-emerald-500/30"
                                                    >
                                                        Approve
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                </div>

                {/* RIGHT COLUMN - Active Personnel */}
                <div className="flex flex-col gap-8">
                    <section className="glass-panel p-6 rounded-2xl h-full">
                        <h2 className="text-xl font-semibold mb-6 text-white/90">Active Personnel</h2>

                        {loading ? (
                            <div className="text-white/50">Loading personnel...</div>
                        ) : (activeAuthorities.length === 0 && activeGuardians.length === 0) ? (
                            <div className="text-white/50 bg-white/5 p-6 rounded-xl border border-white/10 text-center">
                                No active personnel found.
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {/* active authorities */}
                                {activeAuthorities.length > 0 && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium text-white/70">Authorities</h3>
                                        {activeAuthorities.map(authority => (
                                            <motion.div
                                                key={authority.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="p-4 rounded-xl border border-white/10 bg-white/5 flex flex-col xl:flex-row xl:items-center justify-between gap-4"
                                            >
                                                <div>
                                                    <div className="font-semibold text-lg text-primary">{authority.name}</div>
                                                    <div className="text-sm text-white/60">{authority.email}</div>
                                                    <div className="text-xs text-white/40 mt-1">
                                                        Active since: {new Date(authority.created_at).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleDeleteActive(authority.id, 'authorities')}
                                                        className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 font-medium text-sm transition-colors border border-red-500/20"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}

                                {/* active guardians */}
                                {activeGuardians.length > 0 && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium text-white/70">Guardians</h3>
                                        {activeGuardians.map(guardian => (
                                            <motion.div
                                                key={guardian.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="p-4 rounded-xl border border-white/10 bg-white/5 flex flex-col xl:flex-row xl:items-center justify-between gap-4"
                                            >
                                                <div>
                                                    <div className="font-semibold text-lg text-primary">{guardian.name}</div>
                                                    <div className="text-sm text-white/60">{guardian.email}</div>
                                                    <div className="text-xs text-white/40 mt-1">
                                                        Active since: {new Date(guardian.created_at).toLocaleDateString()}
                                                    </div>
                                                    {guardian.category && (
                                                        <div className="text-xs mt-1 inline-block px-2 py-1 rounded bg-white/10 text-white/80">
                                                            {guardian.category}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleDeleteActive(guardian.id, 'guardians')}
                                                        className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 font-medium text-sm transition-colors border border-red-500/20"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
};
