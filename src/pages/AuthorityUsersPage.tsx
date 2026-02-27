import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PlatformUser {
    id: string;
    role: 'CITIZEN' | 'GUARDIAN';
    name: string;
    status: 'ACTIVE' | 'SUSPENDED';
    guardian_status?: 'ONLINE' | 'OFFLINE' | 'ON_DUTY';
    created_at: string;
    last_active: string;
}

const mockUsers: PlatformUser[] = [
    { id: 'c1', role: 'CITIZEN', name: 'Ravi Kumar', status: 'ACTIVE', created_at: '2025-01-15T10:00:00Z', last_active: new Date().toISOString() },
    { id: 'c2', role: 'CITIZEN', name: 'Simran Kaur', status: 'ACTIVE', created_at: '2025-02-10T14:30:00Z', last_active: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
    { id: 'c3', role: 'CITIZEN', name: 'Aman Singh', status: 'SUSPENDED', created_at: '2024-11-05T09:15:00Z', last_active: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString() },

    { id: 'g1', role: 'GUARDIAN', name: 'Vikram Singh', status: 'ACTIVE', guardian_status: 'ONLINE', created_at: '2024-10-12T08:00:00Z', last_active: new Date().toISOString() },
    { id: 'g2', role: 'GUARDIAN', name: 'Pooja Reddy', status: 'ACTIVE', guardian_status: 'ON_DUTY', created_at: '2024-12-01T11:45:00Z', last_active: new Date().toISOString() },
    { id: 'g3', role: 'GUARDIAN', name: 'Neha Gupta', status: 'ACTIVE', guardian_status: 'OFFLINE', created_at: '2025-01-20T16:20:00Z', last_active: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString() },
];

export const AuthorityUsersPage: React.FC = () => {
    const [users, setUsers] = useState<PlatformUser[]>(mockUsers);
    const [activeTab, setActiveTab] = useState<'CITIZEN' | 'GUARDIAN'>('CITIZEN');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredUsers = users.filter(u =>
        u.role === activeTab &&
        u.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSuspend = (id: string) => {
        setUsers(prev => prev.map(u => u.id === id ? { ...u, status: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' } : u));
    };

    const handleDeleteCitizen = (id: string) => {
        if (confirm("Permanently delete citizen account?")) {
            setUsers(prev => prev.filter(u => u.id !== id));
        }
    };

    const handleRequestGuardianDeletion = (id: string) => {
        alert("Deletion request sent to Admin. Guardian is currently flagged.");
        // Mock flagging
        setUsers(prev => prev.map(u => u.id === id ? { ...u, name: u.name + ' (Pending Deletion)' } : u));
    };

    return (
        <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-8">
            <div className="pointer-events-auto w-full max-w-5xl h-[85vh] glass-panel rounded-3xl border border-white/10 flex flex-col shadow-2xl overflow-hidden bg-[#0a0a0a]/95">

                {/* Header */}
                <div className="p-8 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-blue-500/10 to-transparent">
                    <div className="flex items-center gap-4 text-blue-400">
                        <span className="material-symbols-outlined text-4xl">manage_accounts</span>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-white">Platform Users</h1>
                            <p className="text-xs uppercase tracking-[0.2em] font-bold opacity-80 text-blue-400">Authority Control Panel</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab('CITIZEN')}
                            className={`px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'CITIZEN' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-white/5 text-white/50 border border-transparent hover:bg-white/10'}`}
                        >
                            Citizens
                        </button>
                        <button
                            onClick={() => setActiveTab('GUARDIAN')}
                            className={`px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'GUARDIAN' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-white/5 text-white/50 border border-transparent hover:bg-white/10'}`}
                        >
                            Guardians
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="px-8 py-4 border-b border-white/5 flex gap-4">
                    <div className="flex-1 relative">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/30">search</span>
                        <input
                            type="text"
                            placeholder={`Search ${activeTab.toLowerCase()} by name...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 transition-colors"
                        />
                    </div>
                </div>

                {/* User List */}
                <div className="flex-1 overflow-y-auto p-8">
                    {filteredUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-40">
                            <span className="material-symbols-outlined text-5xl mb-3">group_off</span>
                            <p className="font-semibold text-sm">No users found</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <AnimatePresence>
                                {filteredUsers.map(user => (
                                    <motion.div
                                        key={user.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-4 hover:border-white/20 transition-all shadow-lg relative overflow-hidden"
                                    >
                                        {/* Status Stripe */}
                                        <div className={`absolute top-0 left-0 w-full h-1 ${user.status === 'SUSPENDED' ? 'bg-red-500' : 'bg-green-500'}`}></div>

                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/50 border border-white/5 text-lg">
                                                    {user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="text-white font-bold leading-tight">{user.name}</h3>
                                                    <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">ID: {user.id}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className={`text-[9px] px-2 py-0.5 rounded-sm font-bold text-white uppercase tracking-wider ${user.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                    {user.status}
                                                </span>
                                                {user.role === 'GUARDIAN' && user.guardian_status && (
                                                    <span className={`text-[9px] px-2 py-0.5 rounded-sm font-bold text-white uppercase tracking-wider border ${user.guardian_status === 'ONLINE' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                                            user.guardian_status === 'ON_DUTY' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse' :
                                                                'bg-white/5 text-white/40 border-white/10'
                                                        }`}>
                                                        {user.guardian_status.replace('_', ' ')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-[10px] text-white/40 bg-black/40 rounded-xl p-3 border border-white/5">
                                            <div className="flex flex-col">
                                                <span className="uppercase tracking-widest font-bold opacity-50 mb-0.5">Joined</span>
                                                <span className="text-white/80 font-medium">{new Date(user.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="uppercase tracking-widest font-bold opacity-50 mb-0.5">Last Active</span>
                                                <span className="text-white/80 font-medium">{new Date(user.last_active).toLocaleDateString()}</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 mt-auto pt-2">
                                            <button
                                                onClick={() => handleSuspend(user.id)}
                                                className={`flex-1 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-colors ${user.status === 'SUSPENDED'
                                                        ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
                                                        : 'bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20'
                                                    }`}
                                            >
                                                {user.status === 'SUSPENDED' ? 'Revoke Suspension' : 'Suspend Account'}
                                            </button>

                                            {user.role === 'CITIZEN' ? (
                                                <button
                                                    onClick={() => handleDeleteCitizen(user.id)}
                                                    className="flex-1 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-[10px] font-bold uppercase tracking-wider text-red-400 transition-colors"
                                                >
                                                    Delete Account
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleRequestGuardianDeletion(user.id)}
                                                    title="Authorities cannot hard-delete guardians. Sent request to Admin."
                                                    className="flex-1 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-[10px] font-bold uppercase tracking-wider text-red-400 transition-colors flex items-center justify-center gap-1"
                                                >
                                                    <span className="material-symbols-outlined text-[12px]">gavel</span>
                                                    Request Deletion
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
