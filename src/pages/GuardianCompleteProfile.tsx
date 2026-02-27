import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { isGuardianProfileComplete } from '../utils/guardianProfile';

const API = import.meta.env.VITE_API_URL ?? '';
const MAX_SIZE_MB = 2;

const GuardianCompleteProfile: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<'upload' | 'done'>('upload');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Redirect if already complete or not a guardian
    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        if (user.role !== 'guardian') { navigate(`/app/${user.role}`); return; }
        if (isGuardianProfileComplete(user)) { navigate('/app/guardian'); return; }
    }, [user, navigate]);

    // Pre-fill existing image if any
    useEffect(() => {
        if (user?.profile_image_url) setImagePreview(user.profile_image_url);
    }, [user]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setError('Only image files are allowed.'); return;
        }
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            setError(`Image must be smaller than ${MAX_SIZE_MB}MB.`); return;
        }
        setError(null);
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleSave = async () => {
        if (!imageFile && !user?.profile_image_url) {
            setError('Please upload a profile photo.'); return;
        }

        setUploading(true);
        setError(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No active session');

            let imageUrl = user?.profile_image_url || '';

            // Convert image file to base64 data URL (no Supabase Storage needed)
            if (imageFile) {
                imageUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = () => reject(new Error('Failed to read image file'));
                    reader.readAsDataURL(imageFile);
                });
            }

            // Save to backend
            const res = await fetch(`${API}/users/me/upload-profile-image`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ profile_image_url: imageUrl })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || 'Failed to save profile image');
            }

            setSaved(true);
            setStep('done');

            setTimeout(() => {
                window.location.href = '/app/guardian';
            }, 2000);

        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setUploading(false);
        }
    };

    const missing: string[] = [];
    if (!user?.profile_image_url && !imageFile) missing.push('Profile Photo');
    if (!user?.gender) missing.push('Gender');
    if (!user?.phone_verified) missing.push('Phone Verification');

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(183,135,245,0.12) 0%, transparent 60%)' }} />

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                className="w-full max-w-md"
            >
                <AnimatePresence mode="wait">
                    {step === 'done' ? (
                        <motion.div
                            key="done"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-10 text-center"
                        >
                            <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mx-auto mb-4">
                                <span className="material-symbols-outlined text-green-400 text-3xl" style={{ fontVariationSettings: '"FILL" 1' }}>check_circle</span>
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">Profile Complete!</h2>
                            <p className="text-sm text-white/50">Redirecting to your dashboard...</p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="form"
                            className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-8"
                        >
                            {/* Header */}
                            <div className="mb-6">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-purple-400 text-[18px]">shield_person</span>
                                    </div>
                                    <span className="text-[10px] uppercase tracking-[0.2em] text-purple-400 font-bold">Guardian Identity</span>
                                </div>
                                <h1 className="text-2xl font-black text-white">Complete Your Profile</h1>
                                <p className="text-sm text-white/40 mt-1">Required before you can go on duty or accept requests.</p>
                            </div>

                            {/* Missing fields pills */}
                            {missing.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {missing.map(m => (
                                        <span key={m} className="px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider">
                                            Missing: {m}
                                        </span>
                                    ))}
                                    {user?.gender && (
                                        <span className="px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-wider">
                                            ✓ Gender
                                        </span>
                                    )}
                                    {user?.phone_verified && (
                                        <span className="px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-wider">
                                            ✓ Phone Verified
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Profile Photo Upload */}
                            <div className="mb-6">
                                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">
                                    Profile Photo <span className="text-red-400">*</span>
                                </label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="relative w-full aspect-square max-w-[180px] mx-auto rounded-2xl overflow-hidden border-2 border-dashed border-white/20 hover:border-purple-500/50 cursor-pointer transition-all group"
                                >
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-white/5 group-hover:bg-purple-500/5 transition-colors">
                                            <span className="material-symbols-outlined text-white/30 text-4xl group-hover:text-purple-400 transition-colors">add_a_photo</span>
                                            <span className="text-[10px] text-white/30 group-hover:text-purple-400 transition-colors">Click to upload</span>
                                        </div>
                                    )}
                                    {imagePreview && (
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                            <span className="material-symbols-outlined text-white text-2xl">edit</span>
                                        </div>
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                                <p className="text-center text-[10px] text-white/30 mt-2">JPG, PNG, WEBP · Max {MAX_SIZE_MB}MB</p>
                            </div>

                            {/* Info cards for already-set fields */}
                            {user?.gender && (
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 mb-3">
                                    <span className="material-symbols-outlined text-green-400 text-[18px]" style={{ fontVariationSettings: '"FILL" 1' }}>check_circle</span>
                                    <div>
                                        <p className="text-[10px] text-white/40 uppercase tracking-wider">Gender</p>
                                        <p className="text-sm text-white font-medium capitalize">{user.gender.toLowerCase()}</p>
                                    </div>
                                </div>
                            )}
                            {user?.phone_verified && (
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 mb-4">
                                    <span className="material-symbols-outlined text-green-400 text-[18px]" style={{ fontVariationSettings: '"FILL" 1' }}>check_circle</span>
                                    <div>
                                        <p className="text-[10px] text-white/40 uppercase tracking-wider">Phone</p>
                                        <p className="text-sm text-white font-medium">{user.phone || '—'} · Verified</p>
                                    </div>
                                </div>
                            )}

                            {/* Notice if phone not verified */}
                            {!user?.phone_verified && (
                                <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4">
                                    <span className="material-symbols-outlined text-amber-400 text-[18px] mt-0.5">warning</span>
                                    <p className="text-xs text-amber-300/80">
                                        Phone not verified. Contact your Authority to verify your account.
                                    </p>
                                </div>
                            )}

                            {error && (
                                <div className="mb-4 px-4 py-2 rounded-xl text-xs text-red-400 bg-red-500/10 border border-red-500/20">
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={handleSave}
                                disabled={uploading || (!imageFile && !user?.profile_image_url)}
                                className="w-full py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm tracking-wide transition-all"
                            >
                                {uploading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Uploading...
                                    </span>
                                ) : 'Save & Continue'}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default GuardianCompleteProfile;
