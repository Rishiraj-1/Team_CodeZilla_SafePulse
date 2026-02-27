import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { SilentWitnessIndicator, DeviationAlertModal } from '../components/SilentWitness';
import { triggerSOS, updateCitizenLocation, verifyOtp } from '../services/api';
import { sendDirectRequest } from '../services/api';
import { getActiveClusters } from '../services/reportService';
import { fetchMapData } from '../services/mapService';
import mapboxgl from 'mapbox-gl';

type RoutingProfile = 'mapbox/driving' | 'mapbox/walking';

interface CitizenPageContext {
    mapMode: 'default' | 'routing' | 'dangerZone' | 'guardianView';
    setMapMode: (mode: 'default' | 'routing' | 'dangerZone' | 'guardianView') => void;
    setRoutingProfile: (profile: RoutingProfile) => void;
    deviationTriggered: boolean;
    setDeviationTriggered: (v: boolean) => void;
    navState: 'PLANNING' | 'ACTIVE';
    activeDestination: { name: string; coords: [number, number] } | null;
}

const CitizenBottomDock: React.FC<{
    mapMode: 'default' | 'routing' | 'dangerZone' | 'guardianView';
    setMapMode: (mode: 'default' | 'routing' | 'dangerZone' | 'guardianView') => void;
    onSosTrigger: () => void;
    onRouteTap: () => void;
}> = ({ mapMode, setMapMode, onSosTrigger, onRouteTap }) => {
    const navigate = useNavigate();

    if (mapMode === 'routing') return null;

    return (
        <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-6 pointer-events-auto">
            {/* PLAN ROUTE BUTTON */}
            <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={onRouteTap}
                className="h-16 w-16 bg-[#0a0a0a]/80 backdrop-blur-2xl border border-white/5 shadow-glow-subtle hover:shadow-glow-active rounded-full flex items-center justify-center transition-all duration-500 group relative overflow-hidden"
            >
                <div className="absolute inset-0 rounded-full border border-primary/30 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                <span className="material-symbols-outlined text-[24px] text-white/70 group-hover:text-primary transition-colors duration-500">directions</span>
            </motion.button>

            {/* FIND GUARDIAN BUTTON */}
            <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/app/guardian')}
                className="h-16 w-16 bg-[#0a0a0a]/80 backdrop-blur-2xl border border-white/5 shadow-glow-subtle hover:shadow-glow-active rounded-full flex items-center justify-center transition-all duration-500 group relative overflow-hidden"
            >
                <div className="absolute inset-0 rounded-full border border-safe-green/30 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                <span className="material-symbols-outlined text-[24px] text-white/70 group-hover:text-safe-green transition-colors duration-500">security</span>
            </motion.button>

            {/* SOS BUTTON */}
            <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={onSosTrigger}
                className="h-14 w-14 bg-[#110505]/80 backdrop-blur-2xl border border-danger-red/10 rounded-full flex items-center justify-center relative overflow-hidden group transition-all duration-500 hover:border-danger-red/30"
            >
                <div className="absolute inset-0 bg-danger-red/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <span className="material-symbols-outlined text-[20px] text-danger-red/80 group-hover:text-danger-red transition-colors duration-500">sos</span>
            </motion.button>
        </div>
    );
};

export const CitizenPage: React.FC = () => {
    const { mapMode, setMapMode, setRoutingProfile, deviationTriggered, setDeviationTriggered, navState, activeDestination } = useOutletContext<CitizenPageContext>();
    const { user } = useAuth();
    const [isSosActive, setIsSosActive] = useState(false);
    const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
    const [isDashboardOpen, setIsDashboardOpen] = useState(false);
    const [sosStatus, setSosStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
    const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
    const [showProfilePicker, setShowProfilePicker] = useState(false);

    // Live Guardian Stats
    const [nearestGuardianName, setNearestGuardianName] = useState<string>('Scanning...');
    const [nearestGuardianDistance, setNearestGuardianDistance] = useState<string>('--');
    const [nearestGuardianETA, setNearestGuardianETA] = useState<string>('--');

    // Route & Direct Guardian State
    const [acceptedGuardian, setAcceptedGuardian] = useState<any>(null);
    const [nearbyRouteGuardians, setNearbyRouteGuardians] = useState<any[]>([]);
    const [requestingGuardianId, setRequestingGuardianId] = useState<string | null>(null);
    const [requestedGuardians, setRequestedGuardians] = useState<string[]>([]);
    const [isGuardianBoxOpen, setIsGuardianBoxOpen] = useState(false);

    // OTP verification state
    const [otpVisible, setOtpVisible] = useState(false);
    const [otpInput, setOtpInput] = useState('');
    const [otpSessionId, setOtpSessionId] = useState('');
    const [otpStatus, setOtpStatus] = useState<'idle' | 'verifying' | 'success' | 'fail'>('idle');

    // Refs for live markers and citizen broadcast interval
    const guardianMarkerRef = useRef<mapboxgl.Marker | null>(null);
    const citizenBroadcastRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (user?.role === 'citizen') {
            const apiBase = import.meta.env.VITE_API_URL || '';
            const wsUrl = apiBase
                ? apiBase.replace(/^http/, 'ws')
                : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;
            const token = localStorage.getItem('safepulse_auth_token') || sessionStorage.getItem('safepulse_auth_token');
            const ws = new WebSocket(`${wsUrl}/ws/citizen?token=${token || ''}`);

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'request_accepted') {
                        setAcceptedGuardian(data);
                        // Start broadcasting citizen live location every 3s
                        if (citizenBroadcastRef.current) clearInterval(citizenBroadcastRef.current);
                        citizenBroadcastRef.current = setInterval(() => {
                            navigator.geolocation.getCurrentPosition(
                                p => updateCitizenLocation(data.sos_id, p.coords.latitude, p.coords.longitude),
                                () => { },
                                { enableHighAccuracy: true, timeout: 3000 }
                            );
                        }, 3000);
                    } else if (data.type === 'guardian_location') {
                        // Guardian beam: move guardian marker on map
                        const mapInstance = (window as any).mapboxMapInstance as mapboxgl.Map;
                        if (mapInstance) {
                            const lngLat: [number, number] = [data.lng, data.lat];
                            if (!guardianMarkerRef.current) {
                                const el = document.createElement('div');
                                el.style.cssText = 'width:14px;height:14px;border-radius:50%;background:#b787f5;border:2px solid #fff;box-shadow:0 0 10px rgba(183,135,245,0.8);';
                                guardianMarkerRef.current = new mapboxgl.Marker({ element: el })
                                    .setLngLat(lngLat)
                                    .addTo(mapInstance);
                            } else {
                                guardianMarkerRef.current.setLngLat(lngLat);
                            }
                        }
                    } else if (data.type === 'verification_otp') {
                        setOtpSessionId(data.session_id);
                        setOtpVisible(true);
                        setOtpStatus('idle');
                        setOtpInput('');
                    }
                } catch (e) {
                    console.error('Citizen WS error:', e);
                }
            };
            return () => {
                ws.close();
                if (citizenBroadcastRef.current) clearInterval(citizenBroadcastRef.current);
                if (guardianMarkerRef.current) { guardianMarkerRef.current.remove(); guardianMarkerRef.current = null; }
            };
        }
    }, [user]);

    // Open deviation modal when MapContainer fires deviation event
    useEffect(() => {
        if (deviationTriggered) {
            setIsAlertModalOpen(true);
            setDeviationTriggered(false);
        }
    }, [deviationTriggered]);

    const handleRouteTap = () => setShowProfilePicker(true);

    const handleProfileSelect = (profile: RoutingProfile) => {
        setRoutingProfile(profile);
        setShowProfilePicker(false);
        setMapMode('routing');
    };

    const handleDirectRouteRequest = async (guardianId: string) => {
        if (!activeDestination) return;
        setRequestingGuardianId(guardianId);
        try {
            let userLoc = [73.4068, 18.7537];
            try {
                userLoc = await new Promise<any>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(
                        p => resolve([p.coords.longitude, p.coords.latitude]),
                        e => reject(e)
                    );
                });
            } catch (e) { }
            await sendDirectRequest(guardianId, userLoc[1], userLoc[0], activeDestination.name, activeDestination.coords);
            setRequestedGuardians(prev => [...prev, guardianId]);
        } catch (error) {
            console.error(error);
            alert('Failed to send request');
        } finally {
            setRequestingGuardianId(null);
        }
    };

    const handleSosTrigger = () => {
        setIsSosActive(true);
        setSosStatus('sending');
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                try {
                    const response = await triggerSOS(position.coords.latitude, position.coords.longitude);
                    setSosStatus('success');

                    // Save WhatsApp URL to state instead of auto-opening
                    if (response.whatsapp_url) {
                        setWhatsappUrl(response.whatsapp_url);
                    }

                    try {
                        const data = await fetchMapData();
                        const userLoc = [position.coords.longitude, position.coords.latitude];
                        let nearest = null;
                        let minDist = Infinity;

                        data.guardians.forEach((g: any) => {
                            if (g.status === 'ACTIVE') {
                                const dist = Math.sqrt(Math.pow(g.lng - userLoc[0], 2) + Math.pow(g.lat - userLoc[1], 2)) * 111;
                                if (dist < minDist) {
                                    minDist = dist;
                                    nearest = g;
                                }
                            }
                        });

                        if (nearest) {
                            setNearestGuardianName(nearest.name);
                            setNearestGuardianDistance(minDist.toFixed(1) + ' km');
                            setNearestGuardianETA(Math.ceil((minDist / 40) * 60) + 'm ETA');
                        } else {
                            setNearestGuardianName('No Active Guardian');
                        }
                    } catch (e) {
                        console.error("Failed to fetch nearest guardian", e);
                    }

                } catch (err: any) {
                    setSosStatus('error');
                    console.error("SOS Trigger Error:", err);
                    if (err.message && err.message.includes('No emergency contact set')) {
                        alert('No emergency contact set! Please set one from your profile.');
                    } else {
                        alert(`SOS Failed: ${err.message || 'Unknown error'}`);
                    }
                }
            }, () => {
                setSosStatus('error');
            });
        } else {
            setSosStatus('error');
        }
    };

    // ── Live Zone Status ──────────────────────────────────────────
    const [safetyScore, setSafetyScore] = useState(9.0);
    const [lighting, setLighting] = useState<string>('Optimal');
    const [crowd, setCrowd] = useState<string>('Low');
    const [recentReports, setRecentReports] = useState<number>(0);
    const [areaName, setAreaName] = useState<string>('Your Location');
    const zoneRefreshRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

    const haversineKm = (a: [number, number], b: [number, number]) => {
        const toR = (v: number) => (v * Math.PI) / 180;
        const R = 6371;
        const dLat = toR(b[1] - a[1]);
        const dLng = toR(b[0] - a[0]);
        const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a[1])) * Math.cos(toR(b[1])) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.asin(Math.sqrt(s));
    };

    const computeZoneStatus = (pos: GeolocationPosition | null) => {
        const clusters = getActiveClusters();
        const userPos: [number, number] | null = pos
            ? [pos.coords.longitude, pos.coords.latitude]
            : null;

        // Filter clusters within 500m
        const nearby = userPos
            ? clusters.filter(c => haversineKm(userPos, c.coordinates) <= 0.5)
            : [];

        if (nearby.length === 0) {
            // No nearby reports — zone is safe
            const baseScore = 8.5 + Math.random() * 1.0; // 8.5–9.5
            setSafetyScore(parseFloat(baseScore.toFixed(1)));
            setLighting('Optimal');
            setCrowd('Low');
            setRecentReports(0);
        } else {
            // Aggregate intensity from nearby clusters
            const totalIntensity = nearby.reduce((sum, c) => sum + c.intensity, 0);
            const avgIntensity = totalIntensity / nearby.length; // 0–1
            const totalReports = nearby.reduce((sum, c) => sum + c.reports.length, 0);

            // Score: 10 when intensity=0, approaches 2 when intensity=1
            const score = Math.max(2.0, 10 - avgIntensity * 8);
            setSafetyScore(parseFloat(score.toFixed(1)));

            // Lighting: Poor Lighting reports push this down
            const lightingReports = nearby.flatMap(c => c.reports).filter(
                r => r.category === 'Poor Lighting' || r.category === 'Abandoned/Dark Area'
            ).length;
            setLighting(lightingReports > 2 ? 'Poor' : lightingReports > 0 ? 'Dim' : 'Adequate');

            // Crowd: Crowd behavior reports
            const crowdReports = nearby.flatMap(c => c.reports).filter(
                r => r.category === 'Suspicious Loitering' || r.category === 'Unsafe Crowd Behavior'
            ).length;
            setCrowd(crowdReports > 2 ? 'Dense' : crowdReports > 0 ? 'Moderate' : 'Low');

            setRecentReports(totalReports);
        }
    };

    const refreshZone = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => {
                    computeZoneStatus(pos);
                    // Reverse geocode area name
                    fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${pos.coords.longitude},${pos.coords.latitude}.json?types=neighborhood,locality&limit=1&access_token=${import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}`)
                        .then(r => r.json())
                        .then(d => {
                            if (d.features?.length > 0) setAreaName(d.features[0].text);
                        })
                        .catch(() => { });
                },
                () => computeZoneStatus(null),
                { enableHighAccuracy: false, timeout: 5000 }
            );
        } else {
            computeZoneStatus(null);
        }
    };

    useEffect(() => {
        refreshZone();
        zoneRefreshRef.current = setInterval(refreshZone, 60000);
        return () => { if (zoneRefreshRef.current) clearInterval(zoneRefreshRef.current); };
    }, []);

    return (
        <div className="absolute inset-0 z-20 flex pointer-events-none">

            {/* DEV ALERTS MODAL */}
            <DeviationAlertModal
                isOpen={isAlertModalOpen}
                onClose={() => setIsAlertModalOpen(false)}
                onSos={() => { setIsAlertModalOpen(false); handleSosTrigger(); }}
            />

            {/* PROFILE PICKER OVERLAY */}
            <AnimatePresence>
                {showProfilePicker && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-[#050505]/80 backdrop-blur-md pointer-events-auto flex items-center justify-center"
                    >
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                            className="glass-panel border border-white/10 p-8 rounded-3xl w-[340px] flex flex-col items-center gap-6 shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-primary/5 blur-2xl pointer-events-none"></div>
                            <div className="relative z-10 flex flex-col items-center gap-2">
                                <span className="material-symbols-outlined text-[32px] text-primary">alt_route</span>
                                <h2 className="text-lg font-light text-white tracking-tight">How are you travelling?</h2>
                                <p className="text-[11px] text-white/40 uppercase tracking-widest text-center">Choose your travel mode</p>
                            </div>
                            <div className="relative z-10 flex gap-4 w-full">
                                <motion.button
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => handleProfileSelect('mapbox/walking')}
                                    className="flex-1 flex flex-col items-center gap-3 p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300 group"
                                >
                                    <span className="material-symbols-outlined text-[36px] text-white/60 group-hover:text-primary transition-colors">directions_walk</span>
                                    <span className="text-sm font-semibold text-white/80 group-hover:text-white">Walk</span>
                                    <span className="text-[10px] text-white/30 uppercase tracking-widest">Pedestrian</span>
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => handleProfileSelect('mapbox/driving')}
                                    className="flex-1 flex flex-col items-center gap-3 p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300 group"
                                >
                                    <span className="material-symbols-outlined text-[36px] text-white/60 group-hover:text-primary transition-colors">directions_car</span>
                                    <span className="text-sm font-semibold text-white/80 group-hover:text-white">Drive</span>
                                    <span className="text-[10px] text-white/30 uppercase tracking-widest">Vehicle</span>
                                </motion.button>
                            </div>
                            <button
                                onClick={() => setShowProfilePicker(false)}
                                className="relative z-10 text-[10px] text-white/30 hover:text-white/60 uppercase tracking-widest transition-colors"
                            >Cancel</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* SILENT WITNESS (Top Left) */}
            {!isSosActive && mapMode !== 'routing' && <SilentWitnessIndicator onTriggerAlert={() => setIsAlertModalOpen(true)} />}

            {/* SOS FAILSAFE OVERLAY */}
            <AnimatePresence>
                {isSosActive && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.2, ease: "easeInOut" }}
                        className="fixed inset-0 z-40 bg-[rgba(5,5,5,0.85)] backdrop-blur-md pointer-events-auto flex flex-col items-center justify-center"
                    >
                        {/* Centered Ripple & Text */}
                        <div className="relative flex flex-col items-center justify-center -mt-20">
                            {/* Ripples */}
                            <motion.div
                                animate={{ scale: [1, 2.5], opacity: [0.8, 0] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
                                className="absolute size-32 rounded-full border-[2px] border-primary/40 bg-primary/10"
                            ></motion.div>
                            <motion.div
                                animate={{ scale: [1, 2.5], opacity: [0.8, 0] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeOut", delay: 1.5 }}
                                className="absolute size-32 rounded-full border-[2px] border-primary/40 bg-primary/10"
                            ></motion.div>

                            {/* Core Shield */}
                            <motion.div
                                animate={{ y: [-2, 2, -2] }}
                                transition={{ duration: 0.2, repeat: 5, ease: "easeInOut" }} // subtle vibration
                                className={`relative z-10 size-24 rounded-full bg-primary/10 border ${sosStatus === 'error' ? 'border-danger-red' : 'border-primary/30'} flex items-center justify-center shadow-[0_0_40px_rgba(183,135,245,0.3)] backdrop-blur-md`}
                            >
                                <span className={`material-symbols-outlined text-4xl ${sosStatus === 'error' ? 'text-danger-red' : 'text-primary'} ${sosStatus === 'sending' ? 'animate-spin' : ''}`}>
                                    {sosStatus === 'sending' ? 'sync' : sosStatus === 'error' ? 'error' : 'security'}
                                </span>
                            </motion.div>

                            <motion.h2
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 1, duration: 0.8 }}
                                className="mt-8 text-xl font-light text-white/90 tracking-[0.2em] uppercase text-center"
                            >
                                {sosStatus === 'sending' ? 'Sending SOS...' : sosStatus === 'success' ? 'Alert Sent' : 'Failed to Send'}
                            </motion.h2>
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 1.5, duration: 0.8 }}
                                className={`text-[11px] mt-2 tracking-widest uppercase glow-text ${sosStatus === 'error' ? 'text-danger-red' : 'text-primary/80'}`}
                            >
                                {sosStatus === 'sending' ? 'Acquiring Location' : sosStatus === 'success' ? 'Live Tracking Active' : 'Please try again'}
                            </motion.p>
                        </div>

                        {/* Live Tracking Card (replaces bottom dock) */}
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.8, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                            className="absolute bottom-12 w-[340px] p-6 glass-panel border-primary/20 shadow-glow-subtle flex flex-col relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-primary/5 blur-xl pointer-events-none"></div>

                            <div className="flex justify-between items-start mb-6 relative z-10">
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[10px] font-semibold tracking-[0.2em] text-white/40 uppercase">Nearest Guardian</span>
                                    <span className="text-xl font-light text-white tracking-tight">{nearestGuardianName}</span>
                                    <span className="text-[10px] text-white/50">{nearestGuardianDistance} away</span>
                                </div>
                                <span className="text-[10px] font-mono text-primary bg-primary/10 border border-primary/20 px-2 py-1 flex items-center rounded">{nearestGuardianETA}</span>
                            </div>

                            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden mb-6 relative z-10">
                                <motion.div
                                    initial={{ width: "0%" }}
                                    animate={{ width: "100%" }}
                                    transition={{ duration: 120, ease: "linear" }}
                                    className="h-full bg-primary/80 relative"
                                >
                                    <div className="absolute inset-0 shadow-[0_0_10px_rgba(183,135,245,0.8)]"></div>
                                </motion.div>
                            </div>

                            {/* Emergency Call Button */}
                            {whatsappUrl ? (
                                <a
                                    href={whatsappUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full relative z-10 h-11 mb-3 bg-[#25D366]/20 border border-[#25D366]/50 hover:bg-[#25D366]/40 hover:border-[#25D366] text-[#25D366] glow-text font-bold uppercase tracking-[0.1em] rounded-xl flex items-center justify-center transition-all duration-300 gap-2 shadow-[0_0_15px_rgba(37,211,102,0.3)]"
                                >
                                    <span className="material-symbols-outlined text-[18px]">chat</span>
                                    Open WhatsApp
                                </a>
                            ) : (
                                <a
                                    href="tel:181"
                                    className="w-full relative z-10 h-11 mb-3 bg-danger-red/20 border border-danger-red/50 hover:bg-danger-red/40 hover:border-danger-red text-white font-bold uppercase tracking-[0.1em] rounded-xl flex items-center justify-center transition-all duration-300 gap-2 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                                >
                                    <span className="material-symbols-outlined text-[18px]">call</span>
                                    Call Women Helpline (181)
                                </a>
                            )}

                            <button
                                onClick={() => setIsSosActive(false)}
                                className="w-full relative z-10 h-11 border border-white/10 hover:border-white/20 hover:bg-white/5 text-white/50 hover:text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-xl flex items-center justify-center transition-all duration-300"
                            >
                                Cancel Alert
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* RIGHT OVERLAY PANEL - Safety Dashboard */}
            {/* Mobile Toggle Button */}
            <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: isSosActive || mapMode === 'routing' ? 0 : 1, scale: isSosActive || mapMode === 'routing' ? 0.9 : 1 }}
                onClick={() => setIsDashboardOpen(!isDashboardOpen)}
                className={`lg:hidden pointer-events-auto absolute top-28 right-4 z-30 size-10 bg-[#0a0a0a]/90 backdrop-blur-md rounded-full border border-white/10 shadow-glass flex items-center justify-center transition-all ${isSosActive || mapMode === 'routing' ? 'pointer-events-none' : ''}`}
            >
                <span className="material-symbols-outlined text-[20px] text-white/70">{isDashboardOpen ? 'close' : 'analytics'}</span>
            </motion.button>

            <motion.aside
                initial={{ opacity: 0, x: 20 }}
                animate={{
                    opacity: isSosActive || mapMode === 'routing' ? 0 : 1,
                    x: 0
                }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className={`pointer-events-auto absolute top-40 lg:top-28 right-4 lg:right-6 w-[280px] flex flex-col gap-4 z-20 
                    ${isSosActive || mapMode === 'routing' ? 'pointer-events-none select-none' : ''}
                    ${isDashboardOpen ? 'flex' : 'hidden lg:flex'}
                    lg:opacity-100 lg:translate-x-0
                `}
            >
                {/* SAFETY SCORE CARD */}
                <div className="glass-panel p-6 flex flex-col relative overflow-hidden transition-colors duration-500">
                    {/* Subtle ambient glow inside card */}
                    <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl animate-pulse-slow ${safetyScore >= 8 ? 'bg-emerald-500/20' : safetyScore >= 5 ? 'bg-amber-500/20' : 'bg-rose-500/20'
                        }`}></div>

                    <div className="flex justify-between items-center mb-8 z-10">
                        <span className="text-[9px] font-semibold tracking-[0.25em] text-white/40 uppercase">Zone Status</span>
                        <div className="flex items-center gap-2">
                            <span
                                className="w-1.5 h-1.5 rounded-full animate-pulse glow-dot"
                                style={{
                                    backgroundColor: safetyScore >= 8 ? '#10b981' : safetyScore >= 5 ? '#f59e0b' : '#f43f5e',
                                    boxShadow: `0 0 10px ${safetyScore >= 8 ? '#10b981' : safetyScore >= 5 ? '#f59e0b' : '#f43f5e'}`
                                }}
                            ></span>
                            <span className={`text-[9px] font-bold tracking-widest uppercase ${safetyScore >= 8 ? 'text-emerald-400' : safetyScore >= 5 ? 'text-amber-400' : 'text-rose-400'
                                }`}>Live</span>
                        </div>
                    </div>

                    <div className="flex items-baseline gap-1 z-10">
                        <span className={`text-6xl font-light tracking-tighter ${safetyScore >= 8 ? 'text-emerald-400' : safetyScore >= 5 ? 'text-amber-400' : 'text-rose-500'
                            }`}>
                            {safetyScore.toFixed(1)}
                        </span>
                        <span className="text-xl text-white/30 font-light translate-y-[-4px]">/10</span>
                    </div>
                    <span className="text-xs text-white/50 font-medium mt-1 z-10">{areaName}</span>
                </div>

                {/* METRICS CARD */}
                <div className="glass-panel p-6 flex flex-col gap-5">
                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-[16px] text-white/30 group-hover:text-white/60 transition-colors">lightbulb</span>
                            <span className="text-[11px] font-medium text-white/50 uppercase tracking-widest">Lighting</span>
                        </div>
                        <span className="text-[11px] font-medium text-white">{lighting}</span>
                    </div>

                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-[16px] text-white/30 group-hover:text-white/60 transition-colors">groups</span>
                            <span className="text-[11px] font-medium text-white/50 uppercase tracking-widest">Crowd</span>
                        </div>
                        <span className="text-[11px] font-medium text-white">{crowd}</span>
                    </div>

                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-[16px] text-white/30 group-hover:text-white/60 transition-colors">history_edu</span>
                            <span className="text-[11px] font-medium text-white/50 uppercase tracking-widest">Reports</span>
                        </div>
                        <span className={`text-[11px] font-medium ${recentReports === 0 ? 'text-white/40' : 'text-white'}`}>
                            {recentReports === 0 ? 'None' : `${recentReports} Recent`}
                        </span>
                    </div>
                </div>
            </motion.aside>

            {/* ROUTE GUARDIAN UI */}
            <AnimatePresence>
                {mapMode === 'routing' && navState === 'ACTIVE' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, x: "-50%" }}
                        animate={{ opacity: 1, y: 0, x: "-50%" }}
                        exit={{ opacity: 0, y: 20, x: "-50%" }}
                        className="absolute bottom-32 sm:bottom-28 left-1/2 z-40 w-[280px] sm:w-[340px] flex flex-col gap-2 sm:gap-4 pointer-events-auto"
                    >
                        {acceptedGuardian ? (
                            <div className="glass-panel p-5 border border-primary/40 shadow-glow-active rounded-2xl relative overflow-hidden backdrop-blur-2xl bg-[#0a0a0a]/90">
                                <div className="absolute inset-0 bg-primary/10 blur-xl pointer-events-none animate-pulse-slow" />
                                <div className="flex justify-between items-center mb-4 relative z-10 border-b border-white/10 pb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-safe-green animate-pulse" />
                                        <span className="text-[10px] font-bold text-safe-green uppercase tracking-widest">Guardian Attached</span>
                                    </div>
                                    <span className="text-[9px] font-mono text-white/50">{new Date(acceptedGuardian.accepted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="relative z-10 flex gap-4 items-center">
                                    {/* Guardian profile image / icon */}
                                    <div className="size-12 rounded-full overflow-hidden border border-primary/30 flex-shrink-0 bg-primary/10">
                                        {acceptedGuardian.guardian_image_url ? (
                                            <img src={acceptedGuardian.guardian_image_url} alt={acceptedGuardian.guardian_name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <span className="material-symbols-outlined text-[24px] text-primary">security</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col flex-1">
                                        <h3 className="text-base font-semibold text-white tracking-wide">{acceptedGuardian.guardian_name}</h3>
                                        <span className="text-[11px] text-primary/80 uppercase tracking-widest mt-0.5">{acceptedGuardian.guardian_phone}</span>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <a href={`tel:${acceptedGuardian.guardian_phone}`} className="h-8 w-8 bg-primary/20 hover:bg-primary/40 border border-primary/30 rounded-full flex items-center justify-center transition-all">
                                            <span className="material-symbols-outlined text-[14px] text-primary">call</span>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="glass-panel p-3 sm:p-5 border border-white/10 shadow-xl rounded-2xl relative overflow-hidden backdrop-blur-xl bg-[#0a0a0a]/80">
                                <div className="flex justify-between items-center mb-0 sm:mb-4 border-b border-white/5 pb-2 sm:pb-3">
                                    <span className="text-[9px] sm:text-[10px] font-bold text-white/60 uppercase tracking-widest flex-1">Request Guardian</span>
                                    <button
                                        onClick={async () => {
                                            const data = await fetchMapData();
                                            const activeGuardians = data.guardians.filter((g: any) => g.status === 'ACTIVE').slice(0, 3);
                                            setNearbyRouteGuardians(activeGuardians);
                                            setIsGuardianBoxOpen(true); // Open panel when scanned
                                        }}
                                        className="text-[9px] sm:text-[10px] text-primary hover:text-primary/80 transition-colors uppercase tracking-widest mr-2 sm:mr-0"
                                    >
                                        Scan Area
                                    </button>
                                    <button onClick={() => setIsGuardianBoxOpen(!isGuardianBoxOpen)} className="p-1 sm:hidden text-white/50 hover:text-white transition-colors">
                                        <span className="material-symbols-outlined text-[16px]">{isGuardianBoxOpen ? 'expand_less' : 'expand_more'}</span>
                                    </button>
                                </div>

                                <div className={`flex flex-col gap-2 overflow-y-auto custom-scrollbar transition-all duration-300 ${isGuardianBoxOpen ? 'max-h-[150px] opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0 sm:max-h-[150px] sm:opacity-100 sm:mt-0'}`}>
                                    {nearbyRouteGuardians.length === 0 ? (
                                        <div className="text-center text-[10px] text-white/30 py-4 uppercase tracking-widest">Click scan to find guardians</div>
                                    ) : (
                                        nearbyRouteGuardians.map(g => (
                                            <div key={g.id} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5 hover:border-primary/30 transition-all">
                                                <div className="flex items-center gap-3">
                                                    <span className="material-symbols-outlined text-[16px] text-white/40">security</span>
                                                    <span className="text-xs text-white/90 font-medium">{g.name}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleDirectRouteRequest(g.id)}
                                                    disabled={requestingGuardianId === g.id || requestedGuardians.includes(g.id)}
                                                    className={`px-3 py-1.5 border rounded uppercase text-[9px] font-bold tracking-widest transition-all flex items-center justify-center min-w-[70px] ${requestedGuardians.includes(g.id)
                                                        ? 'bg-safe-green/20 text-safe-green border-safe-green/30 opacity-70 cursor-not-allowed'
                                                        : 'bg-primary/20 hover:bg-primary/40 text-primary border-primary/30'
                                                        }`}
                                                >
                                                    {requestingGuardianId === g.id ? (
                                                        <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                                                    ) : requestedGuardians.includes(g.id) ? (
                                                        'REQUESTED'
                                                    ) : (
                                                        'REQUEST'
                                                    )}
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* OTP VERIFICATION MODAL — shown when guardian generates arrival code */}
            <AnimatePresence>
                {otpVisible && (
                    <motion.div
                        key="otp-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-[#050505]/90 backdrop-blur-lg flex items-center justify-center pointer-events-auto"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="w-[320px] bg-[#0d0d0d]/95 border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-5 relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-primary/5 blur-2xl pointer-events-none" />

                            {otpStatus === 'success' ? (
                                <>
                                    <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-green-400 text-3xl" style={{ fontVariationSettings: '"FILL" 1' }}>verified</span>
                                    </div>
                                    <h2 className="text-xl font-bold text-white text-center">Identity Verified!</h2>
                                    <p className="text-sm text-white/40 text-center">Your guardian has been confirmed. You're in safe hands.</p>
                                    <button
                                        onClick={() => setOtpVisible(false)}
                                        className="w-full h-12 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 rounded-2xl font-bold text-sm tracking-wide transition-all"
                                    >
                                        Continue
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="relative z-10 flex flex-col items-center gap-1">
                                        <span className="material-symbols-outlined text-primary text-[40px]" style={{ fontVariationSettings: '"FILL" 1' }}>where_to_vote</span>
                                        <h2 className="text-lg font-bold text-white text-center">Guardian Arrived</h2>
                                        <p className="text-[11px] text-white/40 uppercase tracking-widest text-center">Enter the 4-digit code shown by your guardian</p>
                                    </div>

                                    <div className="relative z-10 w-full">
                                        <input
                                            type="number"
                                            maxLength={4}
                                            value={otpInput}
                                            onChange={e => setOtpInput(e.target.value.slice(0, 4))}
                                            placeholder="_ _ _ _"
                                            className="w-full h-16 bg-white/5 border border-white/10 focus:border-primary/50 rounded-2xl text-center text-4xl font-black text-primary tracking-[0.5em] outline-none transition-all placeholder:text-white/20 placeholder:text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>

                                    {otpStatus === 'fail' && (
                                        <p className="text-xs text-red-400 text-center -mt-2">Incorrect code. Ask your guardian for the correct code.</p>
                                    )}

                                    <div className="relative z-10 w-full flex flex-col gap-2">
                                        <button
                                            disabled={otpInput.length < 4 || otpStatus === 'verifying'}
                                            onClick={async () => {
                                                setOtpStatus('verifying');
                                                try {
                                                    const res = await verifyOtp(otpSessionId, otpInput);
                                                    if (res.verified) {
                                                        setOtpStatus('success');
                                                    } else {
                                                        setOtpStatus('fail');
                                                        setOtpInput('');
                                                    }
                                                } catch {
                                                    setOtpStatus('fail');
                                                }
                                            }}
                                            className="w-full h-12 bg-primary/20 hover:bg-primary/30 disabled:opacity-40 disabled:cursor-not-allowed border border-primary/30 text-primary font-bold text-sm rounded-2xl transition-all flex items-center justify-center gap-2"
                                        >
                                            {otpStatus === 'verifying' ? (
                                                <><span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> Verifying...</>
                                            ) : 'Confirm Identity'}
                                        </button>
                                        <button
                                            onClick={() => setOtpVisible(false)}
                                            className="w-full text-[10px] text-white/30 hover:text-white/60 uppercase tracking-widest transition-colors py-1"
                                        >
                                            Not Yet
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* BOTTOM DOCK */}
            {!isSosActive && (
                <CitizenBottomDock mapMode={mapMode} setMapMode={setMapMode} onSosTrigger={handleSosTrigger} onRouteTap={handleRouteTap} />
            )}
        </div>
    );
};
