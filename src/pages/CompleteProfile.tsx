import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

const CompleteProfile = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [gender, setGender] = useState("");
    const [authorityId, setAuthorityId] = useState("");
    const [authorities, setAuthorities] = useState<{ id: string, name: string, institution: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const API = import.meta.env.VITE_API_URL ?? '';
        fetch(`${API}/users/authorities`)
            .then(res => res.json())
            .then(data => setAuthorities(data))
            .catch(err => console.error("Failed to load authorities", err));
    }, []);

    useEffect(() => {
        if (!user) {
            navigate("/login");
        } else if (user.gender) {
            if (user.status === "PENDING_VERIFICATION") {
                navigate("/verification-pending");
            } else if (user.role && user.role !== "citizen") {
                navigate(`/app/${user.role}`);
            } else {
                navigate("/app/citizen");
            }
        }
    }, [user, navigate]);

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);

        if (!gender) {
            setError("Gender is required.");
            setLoading(false);
            return;
        }
        if (!authorityId && user?.role === "citizen") {
            setError("Please select your local authority.");
            setLoading(false);
            return;
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No session found");

            const API = import.meta.env.VITE_API_URL ?? '';
            const updateRes = await fetch(`${API}/users/update-profile`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ gender, authority_id: authorityId || undefined })
            });

            if (!updateRes.ok) {
                const data = await updateRes.json();
                throw new Error(data.detail || "Failed to update profile");
            }

            // Force reload to get updated user claims if needed
            window.location.reload();
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Simple aesthetic background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[100px] pointer-events-none" style={{ background: "radial-gradient(circle, rgba(183,135,245,0.15) 0%, transparent 60%)" }} />

            <div className="glass p-10 rounded-2xl max-w-md w-full relative z-10 border border-white/5 bg-white/5 backdrop-blur-md">
                <h1 className="text-2xl font-black text-white mb-2">Complete Your Profile</h1>
                <p className="text-sm text-white/50 mb-8">Tell us a bit more about yourself before you enter the SafePulse system.</p>

                {error && (
                    <div className="mb-4 px-4 py-2 rounded-lg text-xs text-red-400" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                        {error}
                    </div>
                )}

                <form className="space-y-6">
                    <div>
                        <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">Gender *</label>
                        <select
                            value={gender}
                            onChange={e => setGender(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#b787f5]/50 transition-colors appearance-none"
                        >
                            <option value="" disabled style={{ color: "black" }}>Select your gender</option>
                            <option value="MALE" style={{ color: "black" }}>Male</option>
                            <option value="FEMALE" style={{ color: "black" }}>Female</option>
                            <option value="OTHER" style={{ color: "black" }}>Other</option>
                        </select>
                    </div>

                    {user?.role === "citizen" && (
                        <div>
                            <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">Local Authority *</label>
                            <select
                                value={authorityId}
                                onChange={e => setAuthorityId(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#b787f5]/50 transition-colors appearance-none"
                            >
                                <option value="" disabled style={{ color: "black" }}>Select your region's authority</option>
                                {authorities.map(auth => (
                                    <option key={auth.id} value={auth.id} style={{ color: "black" }}>
                                        {auth.name} {auth.institution ? `(${auth.institution})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full bg-[#b787f5] text-black font-bold py-3.5 rounded-xl mt-4 hover:opacity-90 transition-opacity tracking-wide disabled:opacity-50"
                    >
                        {loading ? "Processing..." : "Save and Continue"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CompleteProfile;
