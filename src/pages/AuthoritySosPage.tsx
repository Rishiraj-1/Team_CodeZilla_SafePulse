import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import mapboxgl from 'mapbox-gl';

interface SosAlert {
    id: string;
    citizenName: string;
    timeTriggered: string;
    location: [number, number]; // [lng, lat]
    status: 'NEW' | 'RESPONDING' | 'RESOLVED';
    details?: string;
    nearestGuardians: { id: string; name: string; location: [number, number]; distance: string }[];
}

const mockAlerts: SosAlert[] = [
    {
        id: 'sos-123',
        citizenName: 'Priya Sharma',
        timeTriggered: new Date(Date.now() - 1000 * 60 * 3).toISOString(), // 3 mins ago
        location: [73.4068, 18.7537],
        status: 'NEW',
        details: 'Pressed emergency button during commute.',
        nearestGuardians: [
            { id: 'g1', name: 'Rahul V.', location: [73.4090, 18.7545], distance: '300m' },
            { id: 'g2', name: 'Vikram S.', location: [73.4040, 18.7525], distance: '450m' }
        ]
    },
    {
        id: 'sos-456',
        citizenName: 'Anjali Verma',
        timeTriggered: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
        location: [73.4200, 18.7650],
        status: 'RESPONDING',
        details: 'Reported verbal harassment. Guardian assigned.',
        nearestGuardians: []
    }
];

export const AuthoritySosPage: React.FC = () => {
    const { setMapMode } = useOutletContext<any>();
    const [alerts, setAlerts] = useState<SosAlert[]>(mockAlerts);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const markersRef = useRef<{ [id: string]: mapboxgl.Marker }>({});
    const guardianMarkersRef = useRef<mapboxgl.Marker[]>([]);

    useEffect(() => {
        setMapMode('alerts');
        return () => {
            setMapMode('default');
            // Cleanup markers
            Object.values(markersRef.current).forEach((m: any) => m.remove());
            guardianMarkersRef.current.forEach(m => m.remove());
        };
    }, [setMapMode]);

    const mapInstance = (window as any).mapboxMapInstance as mapboxgl.Map;

    useEffect(() => {
        if (!mapInstance) return;

        // Draw SOS alerts
        alerts.forEach(alert => {
            if (!markersRef.current[alert.id] && alert.status !== 'RESOLVED') {
                const el = document.createElement('div');
                el.className = 'w-8 h-8 bg-red-500/80 border-2 border-white rounded-full flex justify-center items-center shadow-[0_0_20px_rgba(239,68,68,0.8)] animate-pulse';
                el.innerHTML = '<span class="material-symbols-outlined text-white text-[18px]">campaign</span>';

                const marker = new mapboxgl.Marker({ element: el })
                    .setLngLat(alert.location)
                    .addTo(mapInstance);

                // Click marker to select
                el.addEventListener('click', () => setSelectedId(alert.id));
                markersRef.current[alert.id] = marker;
            } else if (alert.status === 'RESOLVED' && markersRef.current[alert.id]) {
                markersRef.current[alert.id].remove();
                delete markersRef.current[alert.id];
            }
        });

        // On initial mount: pan map to show all active alerts (so we don't stay at previous map position)
        const active = alerts.filter(a => a.status !== 'RESOLVED');
        if (active.length === 1) {
            mapInstance.flyTo({ center: active[0].location, zoom: 14, duration: 800 });
        } else if (active.length > 1) {
            const bounds = new mapboxgl.LngLatBounds();
            active.forEach(a => bounds.extend(a.location));
            mapInstance.fitBounds(bounds, { padding: 120, maxZoom: 15, duration: 800 });
        }

    }, [alerts, mapInstance]);


    useEffect(() => {
        if (!mapInstance) return;

        // Clear existing guardian markers
        guardianMarkersRef.current.forEach(m => m.remove());
        guardianMarkersRef.current = [];

        const activeAlert = alerts.find(a => a.id === selectedId);
        if (activeAlert) {
            // Fly to alert
            mapInstance.flyTo({ center: activeAlert.location, zoom: 15, duration: 1000 });

            // Draw nearest guardians
            activeAlert.nearestGuardians.forEach(g => {
                const el = document.createElement('div');
                el.className = 'w-6 h-6 bg-green-500 border border-white rounded-full flex justify-center items-center shadow-lg';
                el.innerHTML = '<span class="material-symbols-outlined text-white text-[12px]">shield_person</span>';

                const marker = new mapboxgl.Marker({ element: el })
                    .setLngLat(g.location)
                    .addTo(mapInstance);

                guardianMarkersRef.current.push(marker);
            });
        }
    }, [selectedId, alerts, mapInstance]);

    const handleResolve = (id: string) => {
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'RESOLVED' } : a));
        if (selectedId === id) setSelectedId(null);
    };

    const handleAssign = (alertId: string, guardianId: string) => {
        setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'RESPONDING' } : a));
        alert(`Guardian ${guardianId} assigned!`);
    };

    const formatTime = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="absolute inset-0 pointer-events-none z-20 flex">

            {/* Left Panel - Command Center */}
            <div className="pointer-events-auto w-[400px] h-full bg-[#0a0a0a]/95 backdrop-blur-3xl border-r border-white/10 flex flex-col shadow-2xl overflow-y-auto">

                <div className="p-6 border-b border-white/10 bg-gradient-to-r from-red-500/10 to-transparent">
                    <div className="flex items-center gap-3 text-red-400">
                        <span className="material-symbols-outlined text-3xl">emergency</span>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-white">Emergency Command</h1>
                            <p className="text-xs uppercase tracking-[0.2em] font-bold opacity-80 text-red-400">Active SOS Alerts</p>
                        </div>
                    </div>
                </div>

                <div className="p-4 flex-1 flex flex-col gap-3">
                    {alerts.filter(a => a.status !== 'RESOLVED').length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-40">
                            <span className="material-symbols-outlined text-5xl mb-3">verified</span>
                            <p className="font-semibold text-sm">No Active Emergencies</p>
                        </div>
                    ) : (
                        alerts.filter(a => a.status !== 'RESOLVED').map(alert => (
                            <motion.div
                                key={alert.id}
                                layoutId={alert.id}
                                onClick={() => setSelectedId(alert.id)}
                                className={`p-4 rounded-2xl border cursor-pointer transition-all ${selectedId === alert.id ? 'bg-red-500/10 border-red-500/50' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-white font-bold">{alert.citizenName}</h3>
                                    <span className="text-[10px] bg-red-500 px-2 py-0.5 rounded-sm font-bold text-white uppercase tracking-wider animate-pulse">
                                        {alert.status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 text-xs font-medium text-white/50 mb-3">
                                    <div className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">schedule</span> {formatTime(alert.timeTriggered)}</div>
                                    <div className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">my_location</span> {alert.location[1].toFixed(4)}, {alert.location[0].toFixed(4)}</div>
                                </div>

                                {alert.details && (
                                    <p className="text-sm text-white/70 bg-black/40 p-3 rounded-xl border border-white/5 mb-3">{alert.details}</p>
                                )}

                                {selectedId === alert.id && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-3">

                                        {alert.status === 'NEW' && alert.nearestGuardians.length > 0 && (
                                            <div>
                                                <p className="text-xs uppercase tracking-widest text-white/40 font-bold mb-2">Nearest Available Guardians</p>
                                                <div className="flex flex-col gap-2">
                                                    {alert.nearestGuardians.map(g => (
                                                        <div key={g.id} className="flex justify-between items-center bg-black/50 p-2 rounded-lg border border-white/5">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                                <span className="text-sm text-white/80 font-medium">{g.name}</span>
                                                                <span className="text-xs text-white/40">({g.distance})</span>
                                                            </div>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleAssign(alert.id, g.id); }}
                                                                className="text-[10px] uppercase font-bold tracking-wider bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md text-white transition-all"
                                                            >
                                                                Deploy
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex gap-2 mt-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleResolve(alert.id); }}
                                                className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                                            >
                                                Mark Resolved
                                            </button>
                                            <button
                                                className="flex-1 bg-transparent hover:bg-white/5 text-white/50 border border-white/10 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                                            >
                                                Escalate
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        ))
                    )}
                </div>
            </div>

            {/* Right side has no panel, just the map acting as background */}
        </div>
    );
};
