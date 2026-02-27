import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { fetchMapData, getUserLocation } from '../services/mapService';
import { sendDirectRequest, acceptRequest, updateGuardianLocation, generateVerificationOtp } from '../services/api';
import { isGuardianProfileComplete } from '../utils/guardianProfile';
import mapboxgl from 'mapbox-gl';

const BASE_URL = import.meta.env.VITE_API_URL || '';
// WebSocket base:
const WS_BASE = BASE_URL
    ? BASE_URL.replace(/^http/, 'ws')
    : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;

interface GuardianPageContext {
    setMapMode: (mode: 'default' | 'routing' | 'dangerZone' | 'guardianView') => void;
}

export const GuardianPage: React.FC = () => {
    const { setMapMode } = useOutletContext<GuardianPageContext>();
    const { user } = useAuth();

    const [activeSession, setActiveSession] = useState(false);
    const [activeSosParams, setActiveSosParams] = useState<any>(null);
    const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
    const [sessionTimer, setSessionTimer] = useState<string>("00:00");
    const [otpCode, setOtpCode] = useState<string | null>(null);
    const [otpVerified, setOtpVerified] = useState(false);
    const [citizenLoc, setCitizenLoc] = useState<[number, number] | null>(null);
    const [isOnDuty, setIsOnDuty] = useState(false);

    const [nearbyGuardians, setNearbyGuardians] = useState<any[]>([]);
    const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
    const locRef = useRef<[number, number]>([73.4068, 18.7537]);
    const destMarkerRef = useRef<mapboxgl.Marker | null>(null);
    const citizenMarkerRef = useRef<mapboxgl.Marker | null>(null);
    const guardianBroadcastRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const authTokenRef = useRef<string | null>(null);

    useEffect(() => {
        let interval: any;
        if (activeSession && sessionStartTime) {
            interval = setInterval(() => {
                const diff = Math.floor((Date.now() - sessionStartTime) / 1000);
                const m = Math.floor(diff / 60).toString().padStart(2, '0');
                const s = (diff % 60).toString().padStart(2, '0');
                setSessionTimer(`${m}:${s}`);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [activeSession, sessionStartTime]);

    // ----- Guardian: connect to targeted WS + heartbeat -----
    useEffect(() => {
        if (user?.role === 'guardian') {
            getUserLocation().then(loc => { locRef.current = loc; }).catch(() => { });

            // Use the correct token key used by AuthContext
            const token = localStorage.getItem('safepulse_auth_token') || '';
            authTokenRef.current = token;

            // Connect to per-guardian WS channel
            const ws = new WebSocket(`${WS_BASE}/ws/guardian/${user.id}`);

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'sos_alert') {
                        // Backend already filtered by distance — no client-side distance check
                        setIncomingRequests(prev => {
                            if (prev.find(r => r.sos_id === data.sos_id)) return prev;
                            // Play alert sound
                            try {
                                const ctx = new AudioContext();
                                const osc = ctx.createOscillator();
                                osc.type = 'square';
                                osc.frequency.setValueAtTime(880, ctx.currentTime);
                                osc.frequency.setValueAtTime(440, ctx.currentTime + 0.2);
                                osc.connect(ctx.destination);
                                osc.start();
                                osc.stop(ctx.currentTime + 0.4);
                            } catch (_) { }
                            return [...prev, data];
                        });
                    } else if (data.type === 'direct_request') {
                        if (data.target_guardian_id !== user.id) return;
                        setIncomingRequests(prev => {
                            if (prev.find(r => r.sos_id === data.sos_id)) return prev;
                            return [...prev, data];
                        });
                    } else if (data.type === 'citizen_location') {
                        const newLoc: [number, number] = [data.lng, data.lat];
                        setCitizenLoc(newLoc);
                        const mapInstance = (window as any).mapboxMapInstance as mapboxgl.Map;
                        if (mapInstance) {
                            if (!citizenMarkerRef.current) {
                                const el = document.createElement('div');
                                el.style.cssText = 'width:14px;height:14px;border-radius:50%;background:#10b981;border:2px solid #fff;box-shadow:0 0 10px rgba(16,185,129,0.8);';
                                citizenMarkerRef.current = new mapboxgl.Marker({ element: el })
                                    .setLngLat(newLoc)
                                    .addTo(mapInstance);
                            } else {
                                citizenMarkerRef.current.setLngLat(newLoc);
                            }
                        }
                    } else if (data.type === 'otp_verified') {
                        setOtpVerified(true);
                    } else if (data.type === 'sos_resolved') {
                        setIncomingRequests(prev => prev.filter(r => r.sos_id !== data.sos_id));
                        setActiveSosParams((prev: any) => prev?.sos_id === data.sos_id ? null : prev);
                        setActiveSession(prevSession => {
                            if (activeSosParams?.sos_id === data.sos_id) return false;
                            return prevSession;
                        });
                    }
                } catch (e) {
                    console.error('WS parse error:', e);
                }
            };
            return () => ws.close();
        }
    }, [user, activeSosParams]);

    // Guardian heartbeat: POST location every 30s while on duty
    useEffect(() => {
        if (user?.role !== 'guardian' || !isOnDuty) {
            if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
            return;
        }
        const sendHeartbeat = async () => {
            try {
                const pos = await new Promise<[number, number]>((res, rej) =>
                    navigator.geolocation.getCurrentPosition(
                        p => res([p.coords.longitude, p.coords.latitude]),
                        rej, { enableHighAccuracy: true, timeout: 5000 }
                    )
                );
                locRef.current = pos;
                const token = authTokenRef.current || '';
                await fetch(`${BASE_URL}/sos/guardian/location`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ lat: pos[1], lng: pos[0] }),
                });
            } catch (_) { }
        };
        sendHeartbeat(); // send immediately
        heartbeatRef.current = setInterval(sendHeartbeat, 30_000);
        return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current); };
    }, [user, isOnDuty]);

    // Toggle on-duty status
    const toggleDutyStatus = async () => {
        const newDuty = !isOnDuty;
        const newOnline = newDuty ? 'ONLINE' : 'OFFLINE';
        const newAvail = newDuty ? 'ON_DUTY' : 'OFF_DUTY';
        try {
            const token = authTokenRef.current || localStorage.getItem('safepulse_auth_token') || '';
            await fetch(`${BASE_URL}/sos/guardian/status?availability=${newAvail}&online=${newOnline}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            setIsOnDuty(newDuty);
        } catch (e) {
            console.error('Failed to update duty status', e);
        }
    };

    useEffect(() => {
        if (user?.role === 'citizen') {
            const loadGuardians = async () => {
                try {
                    const data = await fetchMapData();
                    let userLoc = [73.4068, 18.7537]; // Default Lonavala
                    try {
                        userLoc = await getUserLocation();
                    } catch (e) {
                        console.warn("Could not get exact location for distance calc, using default.");
                    }

                    const formatted = data.guardians.map((g: any) => {
                        const dist = Math.sqrt(Math.pow(g.lng - userLoc[0], 2) + Math.pow(g.lat - userLoc[1], 2)) * 111;
                        return {
                            id: g.id,
                            name: g.name,
                            distance: dist.toFixed(1) + ' km',
                            gender: g.gender ? g.gender.charAt(0).toUpperCase() + g.gender.slice(1).toLowerCase() : 'Verified',
                            phone: g.phone || null,
                            profile_image_url: g.profile_image_url || null,
                            status: g.status === 'ACTIVE' ? 'Available' : 'Busy'
                        };
                    });

                    // Sort by distance and take top 5
                    const sorted = formatted.sort((a: any) => parseFloat(a.distance)).slice(0, 5);
                    setNearbyGuardians(sorted);
                } catch (error) {
                    console.error("Failed to load nearby guardians", error);
                }
            };
            loadGuardians();
        }
    }, [user]);

    const handleDirectRequest = async (guardianId: string) => {
        try {
            let userLoc = [73.4068, 18.7537];
            try { userLoc = await getUserLocation(); } catch (e) { }
            await sendDirectRequest(guardianId, userLoc[1], userLoc[0]);
            alert('Support request sent to guardian!');
        } catch (error) {
            console.error(error);
            alert('Failed to send request');
        }
    };

    const handleAcceptRequest = async (req: any) => {
        // Safety check: guardian must have complete profile
        if (user?.role === 'guardian' && !isGuardianProfileComplete(user)) {
            alert('Complete your profile before accepting requests.');
            window.location.href = '/guardian/complete-profile';
            return;
        }
        try {
            const token = authTokenRef.current || localStorage.getItem('safepulse_auth_token') || '';
            // Accept via new geo-filtered SOS endpoint (row-locked, transactional)
            const res = await fetch(`${BASE_URL}/sos/alert/${req.alert_id}/accept`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!res.ok) {
                const err = await res.json();
                alert(err.detail || 'Failed to accept — already assigned.');
                setIncomingRequests(prev => prev.filter(r => r.sos_id !== req.sos_id));
                return;
            }

            setActiveSosParams(req);
            setActiveSession(true);
            setSessionStartTime(Date.now());
            setOtpCode(null);
            setOtpVerified(false);
            setMapMode('guardianView');
            setIncomingRequests(prev => prev.filter(r => r.sos_id !== req.sos_id));

            // Start broadcasting guardian live location every 3s
            if (guardianBroadcastRef.current) clearInterval(guardianBroadcastRef.current);
            guardianBroadcastRef.current = setInterval(async () => {
                try {
                    const pos = await new Promise<[number, number]>((res, rej) =>
                        navigator.geolocation.getCurrentPosition(
                            p => res([p.coords.longitude, p.coords.latitude]),
                            rej, { enableHighAccuracy: true, timeout: 3000 }
                        )
                    );
                    locRef.current = pos;
                    await updateGuardianLocation(req.sos_id, pos[1], pos[0]);
                } catch (e) { /* silent */ }
            }, 3000);

            // Draw Destination marker if present
            if (req.destination_coords) {
                const mapInstance = (window as any).mapboxMapInstance as mapboxgl.Map;
                if (mapInstance) {
                    if (destMarkerRef.current) destMarkerRef.current.remove();
                    const el = document.createElement('div');
                    el.className = 'flex items-center justify-center size-8 bg-[#0a0a0a]/80 border border-primary/50 backdrop-blur-md rounded-full shadow-[0_0_15px_rgba(183,135,245,0.6)]';
                    el.innerHTML = '<span class="material-symbols-outlined text-primary text-[20px]">location_on</span>';
                    destMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
                        .setLngLat(req.destination_coords)
                        .addTo(mapInstance);

                    const bounds = new mapboxgl.LngLatBounds([req.lng, req.lat], [req.lng, req.lat]);
                    bounds.extend(req.destination_coords);
                    mapInstance.fitBounds(bounds, { padding: 100, duration: 1500 });
                }
            }
        } catch (e) {
            console.error("Failed to accept:", e);
            alert("Failed to accept request.");
        }
    };

    const handleDeclineRequest = async (req: any) => {
        try {
            const token = authTokenRef.current || localStorage.getItem('safepulse_auth_token') || '';
            await fetch(`${BASE_URL}/sos/alert/${req.alert_id}/decline`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
            });
        } catch (e) {
            console.error('Decline failed:', e);
        }
        setIncomingRequests(prev => prev.filter(r => r.sos_id !== req.sos_id));
    };

    // Cleanup markers + broadcast when session ends
    useEffect(() => {
        if (!activeSession) {
            if (destMarkerRef.current) { destMarkerRef.current.remove(); destMarkerRef.current = null; }
            if (citizenMarkerRef.current) { citizenMarkerRef.current.remove(); citizenMarkerRef.current = null; }
            if (guardianBroadcastRef.current) { clearInterval(guardianBroadcastRef.current); guardianBroadcastRef.current = null; }
            setCitizenLoc(null);
            setOtpCode(null);
            setOtpVerified(false);
        }
    }, [activeSession]);

    const handleGenerateOtp = async () => {
        if (!activeSosParams) return;
        try {
            const res = await generateVerificationOtp(activeSosParams.sos_id, user?.id || '', user?.name || 'Guardian');
            setOtpCode(res.otp);
        } catch (e) {
            console.error('OTP generation failed:', e);
        }
    };

    return (
        <div className="absolute inset-0 pointer-events-none flex h-screen overflow-hidden z-20">
            {/* LEFT OVERLAY PANEL - Command Dashboard */}
            <motion.aside
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                className="pointer-events-auto absolute top-28 left-6 w-[320px] flex flex-col gap-6"
            >
                {/* STATUS HEAD */}
                <div className="glass-panel p-6 relative overflow-hidden flex flex-col gap-3">
                    <div className="absolute inset-0 bg-safe-green/5 blur-xl pointer-events-none"></div>
                    <div className="flex items-center justify-between z-10">
                        <div className="flex flex-col">
                            <h1 className="text-[11px] font-bold tracking-widest text-white/50 uppercase mb-1">
                                {user?.role === 'citizen' ? 'Guardian Radar' : 'Guardian Unit'}
                            </h1>
                            <span className="text-xl font-light text-white tracking-tight">
                                {user?.role === 'citizen' ? 'Active Scan' : (user?.name || 'Alpha-04')}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 z-10 px-3 py-1.5 bg-safe-green/10 rounded-full border border-safe-green/20 shadow-[0_0_15px_rgba(0,240,118,0.2)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-safe-green animate-pulse"></span>
                            <span className="text-[9px] font-bold text-safe-green tracking-widest uppercase">Online</span>
                        </div>
                    </div>
                    {/* ON DUTY TOGGLE - only for guardians */}
                    {user?.role === 'guardian' && (
                        <button
                            onClick={toggleDutyStatus}
                            className={`z-10 w-full h-9 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 border transition-all duration-300 ${isOnDuty
                                ? 'bg-safe-green/10 border-safe-green/30 text-safe-green hover:bg-safe-green/20'
                                : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:border-white/20'
                                }`}
                        >
                            <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                                {isOnDuty ? 'shield' : 'shield_with_heart'}
                            </span>
                            {isOnDuty ? 'On Duty — Click to Go Off Duty' : 'Go On Duty'}
                        </button>
                    )}
                </div>

                {/* MAIN CARDS */}
                <AnimatePresence mode="wait">
                    {user?.role === 'citizen' ? (
                        // CITIZEN VIEW: See Guardians
                        <motion.div
                            key="citizen-view"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.5 }}
                            className="flex flex-col gap-4"
                        >
                            <h2 className="text-[9px] font-semibold text-white/40 uppercase tracking-[0.25em] ml-2">Nearby Guardians</h2>
                            {nearbyGuardians.map(g => (
                                <div key={g.id} onClick={() => handleDirectRequest(g.id)} className="glass-panel p-5 relative overflow-hidden group cursor-pointer hover:border-primary/40 transition-all duration-300">
                                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                                    <div className="flex justify-between items-start mb-2 relative z-10">
                                        <div className="flex items-center gap-3">
                                            {/* Profile image or icon */}
                                            <div className="size-10 rounded-full overflow-hidden border border-white/10 bg-[#0a0a0a] group-hover:border-primary/50 transition-colors flex-shrink-0">
                                                {g.profile_image_url ? (
                                                    <img src={g.profile_image_url} alt={g.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-[20px] text-white/50 group-hover:text-primary transition-colors">security</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <h3 className="text-sm font-semibold text-white group-hover:text-primary transition-colors">{g.name}</h3>
                                                <span className="text-[10px] text-primary/80 uppercase tracking-widest mt-0.5">{g.gender}</span>
                                                {g.phone && (
                                                    <span className="text-[10px] text-white/40 font-mono mt-0.5">{g.phone}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] text-white/40 font-mono tracking-wider">{g.distance}</span>
                                            <span className={`text-[9px] uppercase tracking-widest mt-1 ${g.status === 'Available' ? 'text-safe-green' : 'text-danger-red'}`}>{g.status}</span>
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-primary/50 text-center uppercase tracking-widest mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Request Support</div>
                                </div>
                            ))}
                        </motion.div>
                    ) : (
                        // GUARDIAN VIEW: See incoming requests
                        !activeSession ? (
                            <motion.div
                                key="requests"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.5 }}
                                className="flex flex-col gap-4"
                            >
                                <h2 className="text-[9px] font-semibold text-white/40 uppercase tracking-[0.25em] ml-2">Incoming Requests</h2>

                                {incomingRequests.length === 0 ? (
                                    <div className="text-white/40 text-[10px] text-center p-4">
                                        {isOnDuty ? 'No active SOS requests' : 'Go On Duty to receive alerts'}
                                    </div>
                                ) : (
                                    incomingRequests.map((req) => (
                                        <div key={req.sos_id} className="glass-panel p-5 relative overflow-hidden group">
                                            <div className="absolute inset-0 bg-danger-red/5 animate-pulse pointer-events-none"></div>
                                            <div className="flex justify-between items-start mb-6 relative z-10">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-10 rounded-full flex items-center justify-center border border-danger-red/30 bg-danger-red/10">
                                                        <span className="material-symbols-outlined text-[20px] text-danger-red" style={{ fontVariationSettings: '"FILL" 1' }}>emergency</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <h3 className="text-sm font-semibold text-white">{req.citizen_name || req.user_name}</h3>
                                                        <span className="text-[10px] text-danger-red uppercase tracking-widest mt-0.5 animate-pulse">SOS Emergency</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] text-white/40 font-mono tracking-wider">
                                                        {req.distance_km ? `${req.distance_km} km` : (req.distance ? `${req.distance} km` : '—')}
                                                    </span>
                                                    <a
                                                        href={req.maps_url || `https://maps.google.com/?q=${req.lat},${req.lng}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[9px] text-primary/60 hover:text-primary mt-1 underline"
                                                        onClick={e => e.stopPropagation()}
                                                    >View Map</a>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleAcceptRequest(req)}
                                                    className="flex-1 h-11 bg-safe-green/10 hover:bg-safe-green/20 text-safe-green hover:text-white border border-safe-green/20 hover:border-safe-green/40 text-[10px] font-bold uppercase tracking-[0.2em] rounded-xl flex items-center justify-center gap-2 transition-all duration-300"
                                                >
                                                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                                    Accept
                                                </button>
                                                <button
                                                    onClick={() => handleDeclineRequest(req)}
                                                    className="px-4 h-11 bg-white/5 hover:bg-danger-red/10 text-white/40 hover:text-danger-red border border-white/10 hover:border-danger-red/30 text-[10px] font-bold uppercase tracking-[0.2em] rounded-xl flex items-center justify-center transition-all duration-300"
                                                >
                                                    Decline
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="active"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.5 }}
                                className="glass-panel p-6 flex flex-col gap-4 relative overflow-hidden border border-primary/30 shadow-glow-active"
                            >
                                <div className="absolute inset-0 bg-primary/10 blur-2xl pointer-events-none animate-pulse-slow" />

                                {/* Timer */}
                                <div className="relative z-10 flex flex-col items-center justify-center gap-1 py-2">
                                    <span className="text-[10px] font-semibold text-primary uppercase tracking-[0.3em] animate-pulse">Session Active</span>
                                    <span className="text-5xl font-light text-white font-mono tracking-tight">{sessionTimer}</span>
                                </div>

                                {/* Citizen info + live location */}
                                <div className="relative z-10 flex flex-col gap-3 border-t border-white/10 pt-4">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 rounded-full border border-white/10 flex items-center justify-center bg-white/5">
                                                <span className="material-symbols-outlined text-[16px] text-white/50">person</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-white tracking-wide">{activeSosParams?.user_name || 'Citizen'}</span>
                                                {citizenLoc && (
                                                    <span className="text-[10px] text-safe-green font-mono mt-0.5">
                                                        📍 {citizenLoc[1].toFixed(5)}, {citizenLoc[0].toFixed(5)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className={`px-2 py-1 rounded-md flex items-center gap-1.5 border ${otpVerified ? 'bg-green-500/10 border-green-500/20' : 'bg-primary/10 border-primary/20'}`}>
                                            <span className={`material-symbols-outlined text-[12px] ${otpVerified ? 'text-green-400' : 'text-primary'}`} style={{ fontVariationSettings: '"FILL" 1' }}>verified_user</span>
                                            <span className={`text-[9px] font-bold tracking-widest uppercase ${otpVerified ? 'text-green-400' : 'text-primary'}`}>{otpVerified ? 'ID Verified ✓' : 'Pending'}</span>
                                        </div>
                                    </div>

                                    {activeSosParams?.destination && (
                                        <div className="flex items-center gap-2 text-[11px] text-white/50">
                                            <span className="material-symbols-outlined text-[14px]">flag</span>
                                            Dest: {activeSosParams.destination}
                                        </div>
                                    )}

                                    {/* OTP Section */}
                                    {!otpVerified && (
                                        <div className="mt-1 p-3 rounded-xl bg-white/5 border border-white/10">
                                            {otpCode ? (
                                                <div className="flex flex-col items-center gap-2">
                                                    <span className="text-[10px] text-white/40 uppercase tracking-wider">Show this code to citizen</span>
                                                    <span className="text-4xl font-black font-mono text-primary tracking-[0.3em]">{otpCode}</span>
                                                    <span className="text-[9px] text-white/30">Waiting for citizen to verify...</span>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={handleGenerateOtp}
                                                    className="w-full h-10 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-all"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">where_to_vote</span>
                                                    I've Arrived — Generate Code
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    <button
                                        onClick={() => { setActiveSession(false); setMapMode('default'); }}
                                        className="w-full h-10 border border-white/10 hover:border-danger-red/40 hover:bg-danger-red/10 text-white/50 hover:text-danger-red text-[10px] font-bold uppercase tracking-[0.2em] rounded-xl flex items-center justify-center transition-all duration-300 mt-1"
                                    >
                                        Cancel Session
                                    </button>
                                </div>
                            </motion.div>
                        )
                    )}
                </AnimatePresence>
            </motion.aside>
        </div>
    );
};
