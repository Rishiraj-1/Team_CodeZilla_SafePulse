import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import {
    initializeMap,
    addSafetyZones,
    addSafetySpots,
    getUserLocation,
    fetchMapData,
    MapUserItem,
    syncUserMarkers,
    fetchRoutes,
    scoreRoute
} from '../services/mapService';
import polylineLib from '@mapbox/polyline';
import { useAuth } from '../context/AuthContext';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

const NAV_SESSION_KEY = 'safepulse_nav_session';
const NAV_ROUTE_KEY = 'safepulse_nav_route';

interface ProcessedRoute {
    internalId: string;
    geometry: string;
    distance: number;
    duration: number;
    steps?: any[];
    riskScore: number | null;
    recommendation: 'SAFE' | 'HIGH_RISK' | null;
    route_risk_score?: number;
}

interface MapContainerProps {
    mode: 'default' | 'routing' | 'dangerZone' | 'guardianView' | 'report' | 'alerts';
    routingProfile?: string;
    authorityId?: string;
    onRouteSelected?: (route: any) => void;
    onMapClick?: (coords: [number, number]) => void;
    onClose?: () => void;
    onDeviation?: () => void;
    onNavStarted?: (destinationInfo: { name: string; coords: [number, number] }) => void;
    onNavExited?: () => void;
}

export const MapContainer: React.FC<MapContainerProps> = ({ mode, routingProfile, authorityId, onMapClick, onClose, onDeviation, onNavStarted, onNavExited }) => {
    

    const closeDirections = () => {
        // Exit active navigation first
        exitNavigation();
        setIsDirectionsOpen(false);
        setHasRoute(false);
        if (onClose) onClose();
    };

    // Determine if we should show layer toggles (Visible for Admins in default map mode)
    const isAdminView = user?.role?.toLowerCase() === 'admin' && mode === 'default';

    return (
        <div className="relative h-screen w-screen">
            <div ref={mapContainer} className="h-full w-full" />

            {/* Permission Denied Notification */}
            {permissionDenied && (
                <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-lg max-w-xs border-l-4 border-yellow-500">
                    <p className="text-sm text-gray-800 font-medium">Location access denied</p>
                    <p className="text-xs text-gray-600 mt-1">Defaulting to City Center.</p>
                </div>
            )}

            {/* Safety Infrastructure Filter Panel */}
            <div className="absolute bottom-28 sm:bottom-8 left-4 z-40 pointer-events-auto">
                {/* Toggle Button */}
                <button
                    onClick={() => setFilterPanelOpen(p => !p)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/70 backdrop-blur-md border border-white/15 shadow-lg text-white text-xs font-bold uppercase tracking-wider hover:bg-white/10 transition-all"
                >
                    <span className="material-symbols-outlined text-[16px] text-purple-400">layers</span>
                    <span className="hidden sm:inline">Safe Places</span>
                    <span className="material-symbols-outlined text-[14px] text-white/50 transition-transform duration-200" style={{ transform: filterPanelOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_less</span>
                </button>

                {/* Dropdown Panel */}
                {filterPanelOpen && (
                    <div className="mt-2 w-48 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-3 flex flex-col gap-2">
                        <p className="text-[10px] uppercase tracking-[0.15em] text-white/40 font-bold px-1 mb-1">Show on Map</p>

                        {/* Police */}
                        <label className="flex items-center gap-3 px-2 py-1.5 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${showPolice ? 'bg-blue-500 border-blue-500' : 'border-white/30 bg-transparent'}`}>
                                {showPolice && <span className="material-symbols-outlined text-[11px] text-white font-bold" style={{ fontVariationSettings: '"FILL" 1,"wght" 700' }}>check</span>}
                            </div>
                            <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                            <span className="text-xs text-white/80 font-medium">Police Station</span>
                            <input type="checkbox" className="sr-only" checked={showPolice} onChange={e => setShowPolice(e.target.checked)} />
                        </label>

                        {/* Hospital */}
                        <label className="flex items-center gap-3 px-2 py-1.5 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${showHospital ? 'bg-emerald-500 border-emerald-500' : 'border-white/30 bg-transparent'}`}>
                                {showHospital && <span className="material-symbols-outlined text-[11px] text-white font-bold" style={{ fontVariationSettings: '"FILL" 1,"wght" 700' }}>check</span>}
                            </div>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                            <span className="text-xs text-white/80 font-medium">Hospital</span>
                            <input type="checkbox" className="sr-only" checked={showHospital} onChange={e => setShowHospital(e.target.checked)} />
                        </label>

                        {/* Fire Station */}
                        <label className="flex items-center gap-3 px-2 py-1.5 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${showFireStation ? 'bg-orange-500 border-orange-500' : 'border-white/30 bg-transparent'}`}>
                                {showFireStation && <span className="material-symbols-outlined text-[11px] text-white font-bold" style={{ fontVariationSettings: '"FILL" 1,"wght" 700' }}>check</span>}
                            </div>
                            <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
                            <span className="text-xs text-white/80 font-medium">Fire Station</span>
                            <input type="checkbox" className="sr-only" checked={showFireStation} onChange={e => setShowFireStation(e.target.checked)} />
                        </label>
                    </div>
                )}
            </div>

            {/* Search/Destination inputs — PLANNING mode only, hidden during ACTIVE navigation */}
            {isDirectionsOpen && navMode === 'PLANNING' && (
                <div className="absolute top-24 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-6">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-panel border border-white/10 rounded-2xl shadow-2xll p-2 flex flex-col gap-2"
                    >
                        {/* Source (Fixed as Your Location for now) */}
                        <div className="flex items-center gap-3 px-3 py-2 bg-white/5 rounded-xl border border-white/5">
                            <span className="material-symbols-outlined text-[18px] text-blue-400">my_location</span>
                            <span className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Your Location</span>
                        </div>

                        {/* Destination Search */}
                        <div className="relative">
                            <div className="flex items-center gap-3 px-3 py-2 bg-white/10 rounded-xl border border-white/20 focus-within:border-blue-500/50 focus-within:bg-blue-500/5 transition-all duration-300">
                                <span className="material-symbols-outlined text-[18px] text-rose-400">location_on</span>
                                <input
                                    type="text"
                                    value={destinationSearch}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    placeholder="Search destination..."
                                    className="bg-transparent border-none outline-none text-white text-[13px] w-full placeholder:text-white/20"
                                />
                                {isSearching ? (
                                    <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    destinationSearch && (
                                        <button
                                            onClick={() => { setDestinationSearch(''); setSearchSuggestions([]); }}
                                            className="material-symbols-outlined text-[16px] text-white/30 hover:text-white"
                                        >
                                            close
                                        </button>
                                    )
                                )}
                            </div>

                            {/* Suggestions Dropdown */}
                            {searchSuggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-3 glass-panel border border-white/10 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 animate-in fade-in slide-in-from-top-2 duration-300 backdrop-blur-xl">
                                    <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
                                        {searchSuggestions.map((s, idx) => (
                                            <button
                                                key={s.id}
                                                onClick={() => selectDestinationSuggest(s)}
                                                className="w-full px-4 py-3 text-left hover:bg-blue-500/10 flex items-start gap-3 border-b border-white/5 last:border-none transition-all duration-200 group"
                                            >
                                                <span className="material-symbols-outlined text-[18px] text-white/20 group-hover:text-blue-400 mt-0.5 transition-colors">history</span>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[12px] font-bold text-white/80 line-clamp-1 group-hover:text-white transition-colors">{s.text}</span>
                                                    <span className="text-[10px] text-white/30 line-clamp-1 group-hover:text-white/50 transition-colors">{s.place_name}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Admin Map Layers Control Box */}
            {isAdminView && (
                <div className="absolute bottom-12 right-8 z-20 glass-panel border border-white/10 pointer-events-auto p-5 rounded-2xl w-[200px]">
                    <h3 className="text-white/80 font-medium text-sm mb-4 tracking-wide uppercase">Map Layers</h3>
                    <div className="space-y-3 text-sm text-white/90">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input type="checkbox" checked={showCitizens} onChange={e => setShowCitizens(e.target.checked)} className="accent-blue-500 w-4 h-4 rounded opacity-70 group-hover:opacity-100 transition-opacity" />
                            <span className="flex items-center gap-2 font-medium"><div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div> Citizen</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input type="checkbox" checked={showGuardians} onChange={e => setShowGuardians(e.target.checked)} className="accent-orange-500 w-4 h-4 rounded opacity-70 group-hover:opacity-100 transition-opacity" />
                            <span className="flex items-center gap-2 font-medium"><div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]"></div> Guardian</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input type="checkbox" checked={showAuthorities} onChange={e => setShowAuthorities(e.target.checked)} className="accent-emerald-500 w-4 h-4 rounded opacity-70 group-hover:opacity-100 transition-opacity" />
                            <span className="flex items-center gap-2 font-medium"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div> Authority</span>
                        </label>
                    </div>
                </div>
            )}

            {/* Tap-to-mark hint — PLANNING mode only */}
            {isDirectionsOpen && navMode === 'PLANNING' && (
                <div className="absolute top-24 right-6 z-30 pointer-events-auto">
                    <div className="flex items-center gap-2 px-4 py-2 glass-panel border border-white/10 rounded-full shadow-xl">
                        <span className="material-symbols-outlined text-[14px] text-white/50">touch_app</span>
                        <span className="text-[10px] text-white/40 uppercase tracking-wider">Tap map to pin destination</span>
                    </div>
                </div>
            )}

            {/* Oracle Routing UI is fixed at the bottom via absolute positioning */}

            {/* START ROUTE button — PLANNING mode only */}
            {isDirectionsOpen && navMode === 'PLANNING' && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex flex-col items-center gap-4 w-full px-6">

                    {/* Oracle Recommendation Panel */}
                    {candidateRoutes.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass-panel border border-white/10 p-4 rounded-2xl w-full max-w-md shadow-2xl backdrop-blur-md"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Oracle Analysis</span>
                                </div>
                                <span className="text-[10px] font-mono text-white/30">{candidateRoutes.length} routes evaluated</span>
                            </div>

                            <div className="space-y-3">
                                {selectedRouteId !== null ? (
                                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-blue-400 text-[20px]">verified_user</span>
                                            <div>
                                                <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wide">Recommended Safe Route</div>
                                                <div className="text-[10px] text-white/50 leading-tight mt-0.5">Avoids all high-risk red zones. Optimized for safety.</div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-amber-400 text-[20px]">warning</span>
                                            <div>
                                                <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wide">No Fully Safe Route Found</div>
                                                <div className="text-[10px] text-white/50 leading-tight mt-0.5">All candidates pass near risk areas. Proceed with CAUTION.</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {candidateRoutes.some(r => r.recommendation === 'HIGH_RISK') && (
                                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-rose-400 text-[20px]">gpp_maybe</span>
                                            <div>
                                                <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wide">Dangerous Route Detected (RED)</div>
                                                <div className="text-[10px] text-white/50 leading-tight mt-0.5">Passes through high-risk red zones. Direct access BLOCKED.</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    <motion.button
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: selectedRouteId !== null ? 1.03 : 1 }}
                        whileTap={{ scale: selectedRouteId !== null ? 0.97 : 1 }}
                        onClick={startNavigation}
                        disabled={selectedRouteId === null}
                        className={`flex items-center gap-3 px-10 py-4 rounded-2xl text-[12px] font-bold uppercase tracking-widest transition-all duration-300 shadow-2xl ${selectedRouteId !== null
                            ? "glass-panel border border-safe-green/30 bg-safe-green/10 text-safe-green hover:bg-safe-green/20 hover:border-safe-green/50 shadow-[0_0_20px_rgba(0,240,118,0.2)]"
                            : "bg-white/5 border border-white/10 text-white/20 cursor-not-allowed"
                            }`}
                    >
                        <span className="material-symbols-outlined text-[20px]">navigation</span>
                        {selectedRouteId !== null ? "Start Safe Navigation" : "Safe Path Unavailable"}
                    </motion.button>
                </div>
            )}

            {/* ACTIVE NAVIGATION indicator + Exit button */}
            {navMode === 'ACTIVE' && (
                <>
                    {(() => {
                        const activeRoute = candidateRoutes.find(r => r.internalId === selectedRouteId);
                        if (!activeRoute) return null;
                        return (
                            <div className="absolute top-20 sm:top-24 left-2 sm:left-4 z-40 pointer-events-auto w-[260px] sm:w-[320px] max-h-[45vh] sm:max-h-[60vh] flex flex-col gap-2">
                                <div className="glass-panel p-2 sm:p-4 border border-primary/30 rounded-2xl shadow-glow-active bg-[#0a0a0a]/90 backdrop-blur-xl">
                                    <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2 pb-1 sm:pb-3 border-b border-primary/20">
                                        <div className="size-6 sm:size-10 rounded-full flex items-center justify-center bg-primary/20 text-primary border border-primary/30 shrink-0">
                                            <span className="material-symbols-outlined text-[16px] sm:text-[24px]">map</span>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-white font-bold text-sm sm:text-lg tracking-wide">
                                                {Math.ceil(activeRoute.duration / 60)} min <span className="text-[10px] sm:text-sm font-light text-white/60">({(activeRoute.distance / 1000).toFixed(1)} km)</span>
                                            </h3>
                                            <p className="text-primary/80 text-[8px] sm:text-[10px] uppercase tracking-widest leading-none mt-0.5">Safe Route En Route</p>
                                        </div>
                                        <button onClick={() => setIsNavExpanded(!isNavExpanded)} className="p-2 sm:hidden text-white/50 hover:text-white transition-colors">
                                            <span className="material-symbols-outlined">{isNavExpanded ? 'expand_less' : 'expand_more'}</span>
                                        </button>
                                    </div>
                                    <div className={`flex flex-col gap-3 custom-scrollbar pr-2 transition-all duration-300 ${isNavExpanded ? 'max-h-[40vh] opacity-100 mt-2 overflow-y-auto' : 'max-h-0 opacity-0 mt-0 overflow-hidden sm:max-h-[40vh] sm:opacity-100 sm:mt-2 sm:overflow-y-auto'}`}>
                                        {activeRoute.steps && activeRoute.steps.map((step: any, idx: number) => (
                                            <div key={idx} className="flex gap-4 items-start pb-2 border-b border-white/5 last:border-0 relative">
                                                <div className="flex flex-col items-center mt-1 z-10 w-6">
                                                    <div className="size-6 shrink-0 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 shadow-inner">
                                                        <span className="material-symbols-outlined text-[14px]">
                                                            {step.maneuver.type.includes('turn') || step.maneuver.type.includes('roundabout') ? (step.maneuver.modifier?.includes('left') ? 'turn_left' : 'turn_right') : 'straight'}
                                                        </span>
                                                    </div>
                                                </div>
                                                {idx !== activeRoute.steps.length - 1 && (
                                                    <div className="absolute left-[11px] top-6 bottom-[-20px] w-[2px] bg-white/10" />
                                                )}
                                                <div className="flex flex-col py-0.5 flex-1 relative z-10">
                                                    <p className="text-white/80 text-[13px] font-medium leading-snug">{step.maneuver.instruction}</p>
                                                    <p className="text-white/40 text-[10px] font-mono mt-1">{(step.distance).toFixed(0)}m</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex flex-col items-center gap-2">
                        <div className="flex items-center gap-3 px-6 py-3 glass-panel border border-primary/30 rounded-2xl">
                            <span className="w-2 h-2 rounded-full bg-safe-green animate-pulse"></span>
                            <span className="text-[11px] font-bold text-white/70 uppercase tracking-widest">Route Active — Monitoring</span>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={closeDirections}
                            className="flex items-center gap-2 px-5 py-2 glass-panel border border-danger-red/30 bg-danger-red/10 text-danger-red hover:bg-danger-red/20 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                        >
                            <span className="material-symbols-outlined text-[14px]">stop_circle</span>
                            Exit Navigation
                        </motion.button>
                    </div>
                </>
            )}
        </div>
    );
};
