import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Phone } from 'lucide-react';

export const EmergencyContactModal: React.FC = () => {
    const { user, setUser } = useAuth();
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // If we don't have a user, or if they already have an emergency contact, don't show
    if (!user || user.emergency_contact_phone) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Clean phone
        const cleaned = phone.replace(/[\+\s\-]/g, '');
        if (!/^\d{10,}$/.test(cleaned)) {
            setError('Please enter a valid phone number (minimum 10 digits)');
            return;
        }

        setLoading(true);
        console.log("Saving emergency contact...", cleaned);
        try {
            const token = localStorage.getItem('safepulse_auth_token') || sessionStorage.getItem('safepulse_auth_token');
            const API = import.meta.env.VITE_API_URL || '';
            console.log("Token present:", !!token, "API URL:", API);

            const res = await fetch(`${API}/users/emergency-contact`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ phone: cleaned })
            });

            console.log("Response status:", res.status);

            if (!res.ok) {
                const errData = await res.json().catch(() => null);
                console.error("Error from backend:", errData);
                throw new Error(errData?.detail || 'Failed to update emergency contact');
            }

            // Update local context
            console.log("Successfully saved emergency contact!");
            setUser(prevUser => prevUser ? { ...prevUser, emergency_contact_phone: cleaned } : null);
        } catch (err: any) {
            console.error("Save failed:", err);
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-800 shadow-2xl mx-4 relative overflow-hidden">
                {/* Header pattern */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-500 to-red-600"></div>

                <div className="flex items-center space-x-3 mb-6">
                    <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center text-rose-600">
                        <ShieldAlert size={28} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Emergency Contact</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Required for SOS functionality</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Phone Number
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Phone size={18} className="text-slate-400" />
                            </div>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="e.g. 919876543210"
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none transition-all text-slate-800 dark:text-white"
                                required
                            />
                        </div>
                    </div>

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        We'll share active tracking links with this contact if you trigger an SOS.
                    </p>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center py-3 px-4 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-rose-500/30 disabled:opacity-70"
                    >
                        {loading ? 'Saving...' : 'Save Contact'}
                    </button>
                </form>
            </div>
        </div>
    );
};
