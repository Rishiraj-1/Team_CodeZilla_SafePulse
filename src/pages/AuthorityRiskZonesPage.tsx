import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import mapboxgl from 'mapbox-gl';

interface RiskZone {
    id: string;
    category: string;
    latitude: number;
    longitude: number;
    risk_level: 'HIGH' | 'MEDIUM' | 'LOW';
    created_at: string;
    source: string;
    radius: number;
    active: boolean;
}

const mockZones: RiskZone[] = [
    {
        id: 'zone-1',
        category: 'Poor Lighting',
        latitude: 18.7537,
        longitude: 73.4068,
        risk_level: 'HIGH',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        source: 'Guardian Report',
        radius: 200,
        active: true
    },
    {
        id: 'zone-2',
        category: 'Suspicious Loitering',
        latitude: 18.7600,
        longitude: 73.4150,
        risk_level: 'MEDIUM',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        source: 'Citizen Consensus',
        radius: 100,
        active: true
    }
];

export const AuthorityRiskZonesPage: React.FC = () => {
    const { setMapMode } = useOutletContext<any>();
    const [zones, setZones] = useState<RiskZone[]>(mockZones);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const mapInstance = (window as any).mapboxMapInstance as mapboxgl.Map;
    const markersRef = useRef<{ [id: string]: mapboxgl.Marker }>({});
    const circlesRef = useRef<{ [id: string]: string }>({});

    useEffect(() => {
        setMapMode('dangerZone');
        return () => {
            setMapMode('default');
            Object.values(markersRef.current).forEach((m: any) => m.remove());
            Object.values(circlesRef.current).forEach((sourceId: any) => {
                if (mapInstance && mapInstance.getSource(sourceId)) {
                    if (mapInstance.getLayer(`${sourceId}-layer`)) mapInstance.removeLayer(`${sourceId}-layer`);
                    mapInstance.removeSource(sourceId);
                }
            });
        };
    }, [setMapMode, mapInstance]);

    // Create GeoJSON circle approximation
    const createGeoJSONCircle = (center: [number, number], radiusInMeters: number, points = 64) => {
        const coords = { latitude: center[1], longitude: center[0] };
        const km = radiusInMeters / 1000;
        const ret = [];
        const distanceX = km / (111.320 * Math.cos(coords.latitude * Math.PI / 180));
        const distanceY = km / 110.574;

        let theta, x, y;
        for (let i = 0; i < points; i++) {
            theta = (i / points) * (2 * Math.PI);
            x = distanceX * Math.cos(theta);
            y = distanceY * Math.sin(theta);
            ret.push([coords.longitude + x, coords.latitude + y]);
        }
        ret.push(ret[0]); // close ring
        return {
            type: 'Feature',
            geometry: { type: 'Polygon', coordinates: [ret] }
        };
    };

    useEffect(() => {
        if (!mapInstance) return;

        // Cleanup removed zones
        const activeIds = new Set(zones.filter(z => z.active).map(z => z.id));
        Object.keys(markersRef.current).forEach(id => {
            if (!activeIds.has(id)) {
                markersRef.current[id].remove();
                delete markersRef.current[id];
                const src = circlesRef.current[id];
                if (src && mapInstance.getSource(src)) {
                    if (mapInstance.getLayer(`${src}-layer`)) mapInstance.removeLayer(`${src}-layer`);
                    mapInstance.removeSource(src);
                    delete circlesRef.current[id];
                }
            }
        });

        // Add/Update zones
        zones.filter(z => z.active).forEach(zone => {
            const isSelected = selectedId === zone.id;

            // Marker
            if (!markersRef.current[zone.id]) {
                const el = document.createElement('div');
                el.className = 'w-6 h-6 bg-amber-500/80 border-2 border-white rounded-full flex justify-center items-center cursor-pointer shadow-lg';
                el.innerHTML = '<span class="material-symbols-outlined text-[12px] text-white">warning</span>';
                el.addEventListener('click', () => setSelectedId(zone.id));
                markersRef.current[zone.id] = new mapboxgl.Marker({ element: el })
                    .setLngLat([zone.longitude, zone.latitude])
                    .addTo(mapInstance);
            } else {
                // Update styling based on selection
                const el = markersRef.current[zone.id].getElement();
                el.className = isSelected
                    ? 'w-8 h-8 bg-red-500 border-2 border-white rounded-full flex justify-center items-center cursor-pointer shadow-[0_0_20px_rgba(239,68,68,0.8)] z-10'
                    : 'w-6 h-6 bg-amber-500/80 border-2 border-white rounded-full flex justify-center items-center cursor-pointer shadow-lg';
            }

            // Circle Polygon
            const sourceId = `zone-poly-${zone.id}`;
            const color = zone.risk_level === 'HIGH' ? '#ef4444' : '#f59e0b';

            const geojson = createGeoJSONCircle([zone.longitude, zone.latitude], zone.radius);

            if (mapInstance.getSource(sourceId)) {
                (mapInstance.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(geojson as any);
                if (mapInstance.getLayer(`${sourceId}-layer`)) {
                    mapInstance.setPaintProperty(`${sourceId}-layer`, 'fill-color', color);
                    mapInstance.setPaintProperty(`${sourceId}-layer`, 'fill-opacity', isSelected ? 0.4 : 0.2);
                }
            } else {
                mapInstance.addSource(sourceId, { type: 'geojson', data: geojson as any });
                mapInstance.addLayer({
                    id: `${sourceId}-layer`,
                    type: 'fill',
                    source: sourceId,
                    paint: {
                        'fill-color': color,
                        'fill-opacity': isSelected ? 0.4 : 0.2,
                        'fill-outline-color': color
                    }
                });
                circlesRef.current[zone.id] = sourceId;
            }
        });

        if (selectedId) {
            const z = zones.find(z => z.id === selectedId);
            if (z) mapInstance.flyTo({ center: [z.longitude, z.latitude], zoom: 14, duration: 800 });
        }

    }, [zones, selectedId, mapInstance]);


    const handleToggleActive = (id: string) => {
        setZones(prev => prev.map(z => z.id === id ? { ...z, active: !z.active } : z));
        if (selectedId === id) setSelectedId(null);
    };

    const handleSeverity = (id: string, level: 'HIGH' | 'MEDIUM' | 'LOW') => {
        setZones(prev => prev.map(z => z.id === id ? { ...z, risk_level: level } : z));
    };

    const handleRadius = (id: string, increment: number) => {
        setZones(prev => prev.map(z => z.id === id ? { ...z, radius: Math.max(50, Math.min(1000, z.radius + increment)) } : z));
    };

    return (
        <div className="absolute inset-0 pointer-events-none z-20 flex">
            {/* Left Panel */}
            <div className="pointer-events-auto w-[420px] h-full bg-[#0a0a0a]/95 backdrop-blur-3xl border-r border-white/10 flex flex-col shadow-2xl">

                <div className="p-6 border-b border-white/10 bg-gradient-to-r from-amber-500/10 to-transparent">
                    <div className="flex items-center gap-3 text-amber-500">
                        <span className="material-symbols-outlined text-3xl">map</span>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-white">Risk Intelligence</h1>
                            <p className="text-xs uppercase tracking-[0.2em] font-bold opacity-80 text-amber-500">Verified Zones</p>
                        </div>
                    </div>
                </div>

                <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-3">
                    {zones.map(zone => (
                        <div
                            key={zone.id}
                            onClick={() => setSelectedId(zone.id)}
                            className={`p-4 rounded-2xl border cursor-pointer transition-all ${!zone.active ? 'opacity-50 grayscale bg-transparent border-white/5' :
                                selectedId === zone.id ? 'bg-amber-500/10 border-amber-500/50' : 'bg-white/5 border-white/10 hover:bg-white/10'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className={`font-bold ${!zone.active ? 'text-white/50' : 'text-white'}`}>{zone.category}</h3>
                                {zone.active ? (
                                    <span className={`text-[9px] px-2 py-0.5 rounded-sm font-bold text-white uppercase tracking-wider ${zone.risk_level === 'HIGH' ? 'bg-red-500' : 'bg-amber-500'}`}>
                                        {zone.risk_level} RISK
                                    </span>
                                ) : (
                                    <span className="text-[9px] bg-white/10 px-2 py-0.5 rounded-sm font-bold text-white/50 uppercase tracking-wider">DISABLED</span>
                                )}
                            </div>

                            <div className="flex flex-col gap-1 text-[11px] text-white/50 mb-3">
                                <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">source</span> Source: {zone.source}</div>
                                <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">event</span> Added: {new Date(zone.created_at).toLocaleDateString()}</div>
                                <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">radar</span> Radius: {zone.radius}m</div>
                            </div>

                            {selectedId === zone.id && zone.active && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-3 border-t border-white/10 flex flex-col gap-3 mt-2">
                                    {/* Action Grids */}
                                    <div className="grid grid-cols-2 gap-2 text-[10px] font-bold uppercase tracking-wider">

                                        <div className="flex flex-col gap-1 border border-white/5 p-2 rounded-xl bg-black/40">
                                            <span className="text-white/40 mb-1">Set Severity</span>
                                            <div className="flex gap-1">
                                                <button onClick={(e) => { e.stopPropagation(); handleSeverity(zone.id, 'HIGH'); }} className={`flex-1 py-1 rounded border ${zone.risk_level === 'HIGH' ? 'bg-red-500/30 text-red-400 border-red-500/50' : 'bg-white/5 text-white/40 border-transparent hover:bg-white/10'}`}>HIGH</button>
                                                <button onClick={(e) => { e.stopPropagation(); handleSeverity(zone.id, 'MEDIUM'); }} className={`flex-1 py-1 rounded border ${zone.risk_level === 'MEDIUM' ? 'bg-amber-500/30 text-amber-400 border-amber-500/50' : 'bg-white/5 text-white/40 border-transparent hover:bg-white/10'}`}>MED</button>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1 border border-white/5 p-2 rounded-xl bg-black/40">
                                            <span className="text-white/40 mb-1">Adjust Radius</span>
                                            <div className="flex gap-1">
                                                <button onClick={(e) => { e.stopPropagation(); handleRadius(zone.id, -50); }} className="flex-1 py-1 rounded bg-white/5 hover:bg-white/10 text-white/70 border border-transparent hover:border-white/20">-50m</button>
                                                <button onClick={(e) => { e.stopPropagation(); handleRadius(zone.id, 50); }} className="flex-1 py-1 rounded bg-white/5 hover:bg-white/10 text-white/70 border border-transparent hover:border-white/20">+50m</button>
                                            </div>
                                        </div>

                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleToggleActive(zone.id); }}
                                            className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold uppercase tracking-wider text-white/60 transition-colors"
                                        >
                                            Disable Zone
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleToggleActive(zone.id); /* Mock Delete */ }}
                                            className="flex-1 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-[10px] font-bold uppercase tracking-wider text-red-400 transition-colors"
                                        >
                                            Soft Delete
                                        </button>
                                    </div>

                                </motion.div>
                            )}

                            {selectedId === zone.id && !zone.active && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-3 mt-2 flex">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleToggleActive(zone.id); }}
                                        className="w-full py-2 rounded-xl bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-[10px] font-bold uppercase tracking-wider text-green-400 transition-colors"
                                    >
                                        Re-activate Zone
                                    </button>
                                </motion.div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
