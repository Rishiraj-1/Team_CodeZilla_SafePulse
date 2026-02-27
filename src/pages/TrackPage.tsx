import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const TrackPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const markerRef = useRef<mapboxgl.Marker | null>(null);

    const [sessionStatus, setSessionStatus] = useState<'LOADING' | 'ACTIVE' | 'ENDED' | 'ERROR'>('LOADING');
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [locations, setLocations] = useState<{ lat: number; lng: number }[]>([]);

    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';
        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/mapbox/dark-v11',
            center: [73.4068, 18.7537], // Default fallback
            zoom: 14,
            pitch: 45,
            bearing: -17.6,
            antialias: true
        });

        // Add 3D buildings
        map.on('style.load', () => {
            if (!map.getLayer('3d-buildings')) {
                const layers = map.getStyle()?.layers;
                let labelLayerId;
                if (layers) {
                    for (let i = 0; i < layers.length; i++) {
                        if (layers[i].type === 'symbol' && layers[i].layout && layers[i].layout['text-field']) {
                            labelLayerId = layers[i].id;
                            break;
                        }
                    }
                }
                map.addLayer(
                    {
                        'id': '3d-buildings',
                        'source': 'composite',
                        'source-layer': 'building',
                        'filter': ['==', 'extrude', 'true'],
                        'type': 'fill-extrusion',
                        'minzoom': 15,
                        'paint': {
                            'fill-extrusion-color': '#2a2a2a',
                            'fill-extrusion-height': [
                                'interpolate',
                                ['linear'],
                                ['zoom'],
                                15, 0,
                                15.05, ['get', 'height']
                            ],
                            'fill-extrusion-base': [
                                'interpolate',
                                ['linear'],
                                ['zoom'],
                                15, 0,
                                15.05, ['get', 'min_height']
                            ],
                            'fill-extrusion-opacity': 0.8
                        }
                    },
                    labelLayerId
                );
            }

            map.addSource('route', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates: []
                    }
                }
            });

            map.addLayer({
                id: 'route-line',
                type: 'line',
                source: 'route',
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': '#ef4444',
                    'line-width': 4,
                    'line-opacity': 0.8
                }
            });
        });

        const el = document.createElement('div');
        el.className = 'w-6 h-6 rounded-full bg-danger-red border-2 border-white shadow-[0_0_15px_rgba(239,68,68,0.8)] relative flex items-center justify-center';
        el.innerHTML = '<div class="absolute inset-0 bg-danger-red rounded-full animate-ping opacity-50"></div><span class="material-symbols-outlined text-white text-[12px]">security</span>';

        markerRef.current = new mapboxgl.Marker(el).setLngLat([0, 0]).addTo(map);
        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, []);

    const fetchTrackingData = async () => {
        if (!sessionId) return;
        try {
            const res = await fetch(`${API_BASE_URL}/sos/location/${sessionId}`);
            if (!res.ok) {
                if (res.status === 404) {
                    setSessionStatus('ERROR');
                }
                return;
            }
            const data = await res.json();

            setSessionStatus(data.active ? 'ACTIVE' : 'ENDED');

            if (data.locations && data.locations.length > 0) {
                const latest = data.locations[data.locations.length - 1]; // backend returns chronological (oldest to newest)
                setLastUpdate(new Date(latest.time));

                // Update locations state for polyline
                const parsedLocs = data.locations.map((loc: any) => ({ lat: loc.lat, lng: loc.lng }));
                setLocations(parsedLocs);

                // Update Map
                if (mapRef.current && markerRef.current) {
                    const coords: [number, number] = [latest.lng, latest.lat];
                    markerRef.current.setLngLat(coords);

                    // Only fly to on the first load or if the user hasn't panned away to make tracking smooth
                    mapRef.current.easeTo({ center: coords, duration: 1000 });

                    // Update route polyline
                    const source = mapRef.current.getSource('route') as mapboxgl.GeoJSONSource;
                    if (source) {
                        source.setData({
                            type: 'Feature',
                            properties: {},
                            geometry: {
                                type: 'LineString',
                                coordinates: parsedLocs.map((loc: any) => [loc.lng, loc.lat])
                            }
                        });
                    }
                }
            }
        } catch (e) {
            console.error('Failed to fetch tracking data', e);
        }
    };

    useEffect(() => {
        fetchTrackingData();
        const interval = setInterval(fetchTrackingData, 3000);
        return () => clearInterval(interval);
    }, [sessionId]);

    return (
        <div className="relative w-full h-screen bg-gray-900 overflow-hidden">
            <div ref={mapContainerRef} className="absolute inset-0" />

            <div className="absolute top-0 left-0 w-full p-6 z-10 pointer-events-none flex justify-between items-start">
                <div className="glass-panel px-6 py-4 rounded-3xl flex flex-col gap-1 border-white/10 shadow-2xl backdrop-blur-md bg-[#0a0a0a]/80">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-danger-red/20 rounded-xl flex items-center justify-center border border-danger-red/30">
                            <span className="material-symbols-outlined text-danger-red">sos</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white tracking-tight">Live SOS Tracking</h1>
                            <p className="text-[11px] text-white/50 uppercase tracking-widest font-mono mt-0.5">Session: {sessionId?.slice(0, 8)}...</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-10 w-[90%] max-w-md pointer-events-auto">
                <AnimatePresence mode="popLayout">
                    {sessionStatus === 'ACTIVE' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="glass-panel p-6 rounded-3xl border border-danger-red/30 shadow-[0_0_30px_rgba(239,68,68,0.2)] flex flex-col items-center gap-4 bg-[#0a0a0a]/90 backdrop-blur-xl relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-danger-red/5 animate-pulse-slow pointer-events-none"></div>

                            <div className="flex flex-col items-center gap-1 z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-danger-red animate-ping glow-dot shadow-[0_0_10px_#ef4444]"></span>
                                    <span className="text-xs font-bold text-danger-red uppercase tracking-widest">Active Emergency</span>
                                </div>
                                <h2 className="text-sm font-medium text-white/90 text-center">Tracking target location in real-time</h2>
                                <p className="text-[11px] text-white/40 font-mono mt-1">
                                    Last update: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Waiting...'}
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {sessionStatus === 'ENDED' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="glass-panel p-6 rounded-3xl border border-safe-green/30 shadow-[0_0_30px_rgba(34,197,94,0.1)] flex flex-col items-center gap-4 bg-[#0a0a0a]/90 backdrop-blur-xl"
                        >
                            <div className="w-12 h-12 bg-safe-green/20 rounded-full flex items-center justify-center border border-safe-green/30">
                                <span className="material-symbols-outlined text-safe-green text-2xl">verified</span>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <h2 className="text-lg font-bold text-safe-green">Session Ended</h2>
                                <p className="text-xs text-white/60 text-center">The user has marked their location as safe and ended the SOS broadcast.</p>
                            </div>
                        </motion.div>
                    )}

                    {sessionStatus === 'ERROR' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col items-center gap-4 bg-[#0a0a0a]/90 backdrop-blur-xl"
                        >
                            <span className="material-symbols-outlined text-white/40 text-4xl">error</span>
                            <div className="flex flex-col items-center gap-1">
                                <h2 className="text-lg font-bold text-white/80">Session Not Found</h2>
                                <p className="text-xs text-white/50 text-center">This tracking link is invalid or has expired.</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
