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
    const { user } = useAuth();
    const location = useLocation();
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);

    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const userLocationRef = useRef<[number, number] | null>(null);
    useEffect(() => {
        userLocationRef.current = userLocation;
    }, [userLocation]);

    const [permissionDenied, setPermissionDenied] = useState(false);
    const [isDirectionsOpen, setIsDirectionsOpen] = useState(false);
    const [isNavExpanded, setIsNavExpanded] = useState(false);
    const isDirectionsOpenRef = useRef(false);
    useEffect(() => {
        isDirectionsOpenRef.current = isDirectionsOpen;
    }, [isDirectionsOpen]);

    const [hasRoute, setHasRoute] = useState(false);
    // PLANNING = editable, ACTIVE = locked (no tap-to-route, no recalculation)
    const [navMode, setNavMode] = useState<'PLANNING' | 'ACTIVE'>('PLANNING');
    const navModeRef = useRef<'PLANNING' | 'ACTIVE'>('PLANNING');
    useEffect(() => {
        navModeRef.current = navMode;
    }, [navMode]);
    const frozenRouteRef = useRef<[number, number][]>([]);
    const routeCoordsRef = useRef<[number, number][]>([]);
    const watchIdRef = useRef<number | null>(null);
    const deviationFiredRef = useRef(false);

    // Map Layers State
    const [mapData, setMapData] = useState<{ citizens: MapUserItem[], guardians: MapUserItem[], authorities: MapUserItem[] }>({ citizens: [], guardians: [], authorities: [] });
    const [showCitizens, setShowCitizens] = useState(true);
    const [showGuardians, setShowGuardians] = useState(true);
    const [showAuthorities, setShowAuthorities] = useState(true);
    const markersRef = useRef<mapboxgl.Marker[]>([]);

    // Safety spot filter state
    const [showPolice, setShowPolice] = useState(true);
    const [showHospital, setShowHospital] = useState(true);
    const [showFireStation, setShowFireStation] = useState(true);
    const [filterPanelOpen, setFilterPanelOpen] = useState(false);

    // Apply Mapbox layer filter whenever checkboxes change
    useEffect(() => {
        if (!map.current) return;
        const activeAmenities: string[] = [];
        if (showPolice) activeAmenities.push('police');
        if (showHospital) activeAmenities.push('hospital');
        if (showFireStation) activeAmenities.push('fire_station');

        let filter: any;
        if (activeAmenities.length === 0) {
            // Hide all: match an impossible value
            filter = ['==', ['get', 'amenity'], '___none___'];
        } else if (activeAmenities.length === 3) {
            // Show all: match any known amenity type
            filter = ['in', ['get', 'amenity'], ['literal', ['police', 'hospital', 'fire_station']]];
        } else {
            // Show selected subset
            filter = ['in', ['get', 'amenity'], ['literal', activeAmenities]];
        }

        ['safety-spots-circle', 'safety-spots-symbol'].forEach(layerId => {
            if (map.current?.getLayer(layerId)) {
                map.current.setFilter(layerId, filter);
            }
        });
    }, [showPolice, showHospital, showFireStation]);


    const [destinationSearch, setDestinationSearch] = useState('');
    const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const destMarkerRef = useRef<mapboxgl.Marker | null>(null);

    const [candidateRoutes, setCandidateRoutes] = useState<ProcessedRoute[]>([]);
    const candidateRoutesRef = useRef<ProcessedRoute[]>([]);
    useEffect(() => {
        candidateRoutesRef.current = candidateRoutes;
    }, [candidateRoutes]);

    const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

    const modeRef = useRef(mode);
    useEffect(() => {
        modeRef.current = mode;
    }, [mode]);

    // Initial Map Setup
    useEffect(() => {
        if (map.current) return;
        if (!mapContainer.current) return;

        const setupMap = async () => {
            let center: [number, number] = [73.4068, 18.7537]; // Default: Lonavala

            try {
                const location = await getUserLocation();
                center = location;
                setUserLocation(location);
            } catch (error: any) {
                const isDenied = error?.code === 1; // PERMISSION_DENIED
                console.warn('Location error (code', error?.code, '):', error?.message);
                if (isDenied) {
                    setPermissionDenied(true);
                    // Auto-dismiss after 4 seconds
                    setTimeout(() => setPermissionDenied(false), 4000);
                }
                // For timeout / unavailable, just continue with default center — no banner
            }

            map.current = initializeMap(mapContainer.current!, center);
            (window as any).mapboxMapInstance = map.current; // Expose globally for Guardian Page

            const isAdmin = user?.role?.toLowerCase() === 'admin';
            const geolocate = new mapboxgl.GeolocateControl({
                positionOptions: {
                    enableHighAccuracy: true
                },
                trackUserLocation: true,
                showUserHeading: true,
                showUserLocation: !isAdmin, // Hides the blue dot for Admin
            });
            map.current.addControl(geolocate, 'bottom-right');

            map.current.on('load', async () => {
                if (map.current) {
                    addSafetyZones(map.current, center);
                    // Load OSM safety infrastructure (police, hospitals, fire stations)
                    addSafetySpots(map.current);

                    // Fetch real-time map data
                    const data = await fetchMapData(authorityId);
                    setMapData(data);

                    // ── Live Risk Zones overlay (accepted, authority-verified) ──
                    const loadRiskZones = async () => {
                        if (!map.current) return;
                        const token = localStorage.getItem('safepulse_auth_token');
                        if (!token) return;
                        try {
                            const res = await fetch(
                                `${import.meta.env.VITE_API_URL ?? ''}/api/risk-zones`,
                                { headers: { Authorization: `Bearer ${token}` } }
                            );
                            if (!res.ok) return;
                            const zones: { id: string; latitude: number; longitude: number; risk_level: string; category?: string }[] = await res.json();

                            // Remove old markers
                            document.querySelectorAll('.safepulse-risk-zone-marker').forEach(el => el.remove());

                            zones.forEach(zone => {
                                if (!map.current) return;
                                // Zones are now rendered as geographic GeoJSON polygon
                                // circles via mapService.ts — no HTML marker needed.
                            });
                        } catch { /* silent */ }
                    };

                    await loadRiskZones();
                    // Refresh every 30 seconds
                    const riskZoneInterval = setInterval(loadRiskZones, 30000);
                    // Store interval ID for cleanup
                    (map.current as any)._riskZoneInterval = riskZoneInterval;

                    // ── Restore active navigation session if page was reloaded ──
                    const savedRouteRaw = sessionStorage.getItem(NAV_ROUTE_KEY);
                    const savedSession = sessionStorage.getItem(NAV_SESSION_KEY);
                    if (savedRouteRaw && savedSession) {
                        try {
                            const savedRoute = JSON.parse(savedRouteRaw);
                            const session = JSON.parse(savedSession);
                            if (session.navState === 'ACTIVE' && savedRoute.geometry) {
                                const geom: [number, number][] = polylineLib.decode(savedRoute.geometry).map(
                                    (c: [number, number]) => [c[1], c[0]] as [number, number]
                                );
                                frozenRouteRef.current = [...geom];
                                navModeRef.current = 'ACTIVE';
                                setNavMode('ACTIVE');
                                setDestinationSearch(savedRoute.destination || '');
                                setHasRoute(true);
                                setIsDirectionsOpen(true);

                                // Restore blue full-route layer
                                if (!map.current!.getSource('route-active-nav')) {
                                    map.current!.addSource('route-active-nav', {
                                        type: 'geojson',
                                        data: polylineLib.toGeoJSON(savedRoute.geometry)
                                    });
                                    map.current!.addLayer({
                                        id: 'route-active-nav-line',
                                        type: 'line',
                                        source: 'route-active-nav',
                                        paint: { 'line-color': '#3b82f6', 'line-width': 10, 'line-opacity': 1 }
                                    });
                                }
                                // Restore green remaining-route layer
                                if (!map.current!.getSource('remaining-route')) {
                                    map.current!.addSource('remaining-route', {
                                        type: 'geojson',
                                        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: geom } }
                                    });
                                    map.current!.addLayer({
                                        id: 'remaining-route',
                                        type: 'line',
                                        source: 'remaining-route',
                                        paint: { 'line-color': '#22c55e', 'line-width': 5, 'line-opacity': 1 }
                                    });
                                }
                                // Fit map to route
                                const bounds = new mapboxgl.LngLatBounds();
                                geom.forEach(c => bounds.extend(c));
                                map.current!.fitBounds(bounds, { padding: 80, duration: 1200 });

                                // Re-add destination marker
                                if (savedRoute.destCoords && !destMarkerRef.current) {
                                    const el = document.createElement('div');
                                    el.className = 'flex items-center justify-center size-8 bg-[#0a0a0a]/80 border border-primary/50 backdrop-blur-md rounded-full shadow-[0_0_15px_rgba(183,135,245,0.6)]';
                                    el.innerHTML = '<span class="material-symbols-outlined text-primary text-[20px]">location_on</span>';
                                    destMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
                                        .setLngLat(savedRoute.destCoords)
                                        .addTo(map.current!);
                                }

                                // Restart GPS watcher for deviation detection
                                deviationFiredRef.current = false;
                                watchIdRef.current = navigator.geolocation.watchPosition(
                                    (pos) => {
                                        if (navModeRef.current !== 'ACTIVE') return;
                                        const userPos: [number, number] = [pos.coords.longitude, pos.coords.latitude];
                                        if (frozenRouteRef.current.length > 1 && map.current && map.current.getSource('remaining-route')) {
                                            const idx = closestRouteIndex(userPos, frozenRouteRef.current);
                                            const remaining = frozenRouteRef.current.slice(idx);
                                            (map.current.getSource('remaining-route') as mapboxgl.GeoJSONSource).setData({
                                                type: 'Feature', properties: {},
                                                geometry: { type: 'LineString', coordinates: remaining.length > 1 ? remaining : [userPos, userPos] }
                                            });
                                        }
                                        const dist = distanceFromRoute(userPos, frozenRouteRef.current);
                                        if (dist > 40 && !deviationFiredRef.current) {
                                            deviationFiredRef.current = true;
                                            if (onDeviation) onDeviation();
                                            setTimeout(() => { deviationFiredRef.current = false; }, 30000);
                                        }
                                    },
                                    (err) => console.warn('Watch position error:', err),
                                    { enableHighAccuracy: true, maximumAge: 2000 }
                                );

                                // Notify parent that nav is still active
                                if (onNavStarted) {
                                    onNavStarted({ name: savedRoute.destination || 'Map Location', coords: savedRoute.destCoords });
                                }
                            }
                        } catch (e) {
                            console.warn('Failed to restore nav session:', e);
                            sessionStorage.removeItem(NAV_ROUTE_KEY);
                        }
                    }
                }
                // Trigger geolocate control immediately to show blue dot
                geolocate.trigger();

                // Retry getting live location after map is ready
                getUserLocation().then((loc) => {
                    setUserLocation(loc);
                    map.current?.flyTo({ center: loc, zoom: 15, duration: 1500 });
                }).catch(() => { /* already on default center, ignore */ });
            });

            map.current.on('click', (e) => {
                const coords: [number, number] = [e.lngLat.lng, e.lngLat.lat];

                if (modeRef.current === 'report') {
                    if (onMapClick) onMapClick(coords);

                    if (map.current) {
                        const existingMarker = document.getElementById('report-temp-marker');
                        if (existingMarker) existingMarker.remove();

                        const el = document.createElement('div');
                        el.id = 'report-temp-marker';
                        el.className = 'w-4 h-4 bg-rose-500 rounded-full border-2 border-white shadow-[0_0_15px_rgba(244,63,94,0.8)] animate-pulse';

                        new mapboxgl.Marker(el)
                            .setLngLat(coords)
                            .addTo(map.current);

                        map.current.flyTo({ center: coords, zoom: 16, duration: 800 });
                    }
                } else if (isDirectionsOpenRef.current) {
                    // This block handles Oracle destination selection (tap mapping)
                    if (navModeRef.current === 'ACTIVE') return;
                    handleDestinationSelected(coords, "Pinned on Map");
                }
            });
        };

        setupMap();

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, [authorityId]);

    const clearAllRoutes = () => {
        if (!map.current) return;
        candidateRoutesRef.current.forEach(route => {
            const id = `route-${route.internalId}`;
            if (map.current!.getLayer(`${id}-line`)) map.current!.removeLayer(`${id}-line`);
            if (map.current!.getSource(id)) map.current!.removeSource(id);
        });
        setCandidateRoutes([]);
        setSelectedRouteId(null);

        if (destMarkerRef.current) {
            destMarkerRef.current.remove();
            destMarkerRef.current = null;
        }
    };

    const drawOracleRoutes = (routes: ProcessedRoute[], selectedId: string | null) => {
        if (!map.current) return;

        routes.forEach((route) => {
            const id = `route-${route.internalId}`;
            const geojson = polylineLib.toGeoJSON(route.geometry);
            const isSelected = route.internalId === selectedId;
            const isSafe = route.recommendation !== 'HIGH_RISK';

            // Priority coloring: Selected safe route is prominent blue. Others are less visible or red.
            let color = '#ef4444'; // default red
            if (isSafe) {
                color = isSelected ? '#3b82f6' : '#94a3b8'; // Blue if selected, grey if alternative safe
            }

            if (map.current!.getSource(id)) {
                (map.current!.getSource(id) as mapboxgl.GeoJSONSource).setData(geojson);
            } else {
                map.current!.addSource(id, {
                    type: 'geojson',
                    data: geojson
                });
                map.current!.addLayer({
                    id: `${id}-line`,
                    type: 'line',
                    source: id,
                    layout: {
                        'line-cap': 'round',
                        'line-join': 'round'
                    },
                    paint: {
                        'line-color': color,
                        'line-width': isSelected ? 8 : (isSafe ? 4 : 3),
                        'line-opacity': isSelected ? 1.0 : 0.5
                    }
                });
            }
        });

        const bounds = new mapboxgl.LngLatBounds();
        routes.forEach(r => {
            const coords = polylineLib.decode(r.geometry);
            coords.forEach(c => bounds.extend([c[1], c[0]]));
        });
        map.current.fitBounds(bounds, { padding: 80 });
    };

    const handleDestinationSelected = async (destination: [number, number], label?: string) => {
        const uLoc = userLocationRef.current;
        if (!map.current || !uLoc) return;
        if (label) setDestinationSearch(label);

        clearAllRoutes();
        setHasRoute(true);

        try {
            const rawRoutes = await fetchRoutes(uLoc, destination);

            // Step 1: Assign Stable Internal IDs
            const processedRoutes: ProcessedRoute[] = rawRoutes.map((r: any) => ({
                internalId: crypto.randomUUID(),
                geometry: r.geometry,
                distance: r.distance,
                duration: r.duration,
                steps: r.legs?.[0]?.steps || [],
                riskScore: null,
                recommendation: null
            }));

            // Step 2: After Risk Scoring
            const scoredRoutes = await Promise.all(processedRoutes.map(async (r) => {
                const score = await scoreRoute(r.geometry);
                return {
                    ...r,
                    riskScore: score.route_risk_score,
                    recommendation: score.recommendation,
                    route_risk_score: score.route_risk_score
                };
            }));

            setCandidateRoutes(scoredRoutes);

            // Find the best route ID (Safety First)
            let minScore = Infinity;
            let bestId: string | null = null;

            scoredRoutes.forEach((r) => {
                const score = r.route_risk_score || 0;
                const isSafe = r.recommendation !== 'HIGH_RISK';

                if (isSafe) {
                    if (score < minScore) {
                        minScore = score;
                        bestId = r.internalId;
                    }
                }
            });

            // Step 3: Route Selection (ID Based Only)
            setSelectedRouteId(bestId);

            console.log("Oracle Identity Binding Set:");
            console.log(" - Destination:", label || "Map Click");
            console.log(" - Initial Selection ID:", bestId);

            if (destMarkerRef.current) {
                destMarkerRef.current.remove();
            }
            const el = document.createElement('div');
            el.className = 'flex items-center justify-center size-8 bg-[#0a0a0a]/80 border border-primary/50 backdrop-blur-md rounded-full shadow-[0_0_15px_rgba(183,135,245,0.6)]';
            el.innerHTML = '<span class="material-symbols-outlined text-primary text-[20px]">location_on</span>';
            destMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
                .setLngLat(destination)
                .addTo(map.current);

            drawOracleRoutes(scoredRoutes, bestId);

        } catch (err) {
            console.error("Routing error:", err);
        }
    };

    const handleSearch = async (query: string) => {
        setDestinationSearch(query);
        if (query.length < 3) {
            setSearchSuggestions([]);
            return;
        }

        setIsSearching(true);
        try {
            const proximity = userLocation ? `&proximity=${userLocation[0]},${userLocation[1]}` : '';
            const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}&limit=5&countries=in${proximity}&bbox=74.0200,21.0800,82.8100,26.8700`);
            const data = await res.json();
            setSearchSuggestions(data.features || []);
        } catch (e) {
            console.error('Search failed', e);
        } finally {
            setIsSearching(false);
        }
    };

    const selectDestinationSuggest = (suggest: any) => {
        const coords = suggest.center as [number, number];
        setDestinationSearch(suggest.text);
        setSearchSuggestions([]);
        handleDestinationSelected(coords);
    };

    // Render roles onto map based on toggles
    useEffect(() => {
        if (!map.current) return;

        // Clear existing generated markers
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];

        let newMarkers: mapboxgl.Marker[] = [];

        if (showCitizens) {
            newMarkers = newMarkers.concat(syncUserMarkers(map.current, mapData.citizens, '#3b82f6')); // Blue
        }
        if (showGuardians) {
            newMarkers = newMarkers.concat(syncUserMarkers(map.current, mapData.guardians, '#f97316')); // Orange
        }
        if (showAuthorities) {
            newMarkers = newMarkers.concat(syncUserMarkers(map.current, mapData.authorities, '#10b981')); // Green
        }

        markersRef.current = newMarkers;

    }, [mapData, showCitizens, showGuardians, showAuthorities]);

    // Mock Warnings State for 'alerts' mode
    const warningMarkersRef = useRef<mapboxgl.Marker[]>([]);

    useEffect(() => {
        if (!map.current) return;

        warningMarkersRef.current.forEach(m => m.remove());
        warningMarkersRef.current = [];

        if (mode === 'alerts') {
            const MOCK_WARNINGS = [
                { id: 1, type: "Crowd Disturbance", time: "10m ago", desc: "Large unauthorized gathering reported near Lonavala market.", lat: 18.7537, lng: 73.4068 },
                { id: 2, type: "Suspicious Activity", time: "25m ago", desc: "Multiple reports of lingering suspect near ATM.", lat: 18.7580, lng: 73.4150 },
                { id: 3, type: "Emergency SOS", time: "1h ago", desc: "Citizen initiated SOS from dark alley.", lat: 18.7490, lng: 73.4020 }
            ];

            MOCK_WARNINGS.forEach(warn => {
                const el = document.createElement('div');
                el.className = 'w-6 h-6 bg-red-500 rounded-full border-[3px] border-[#050505] shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse flex items-center justify-center cursor-pointer';
                const inner = document.createElement('div');
                inner.className = 'w-2 h-2 bg-white rounded-full';
                el.appendChild(inner);

                const popupHTML = `
                    <div class="p-1 min-w-[140px] text-left">
                        <div class="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1">${warn.type}</div>
                        <div class="text-xs text-gray-800 leading-tight">${warn.desc}</div>
                        <div class="text-[9px] text-gray-500 mt-2 font-mono">${warn.time}</div>
                    </div>
                `;

                const marker = new mapboxgl.Marker(el)
                    .setLngLat([warn.lng, warn.lat])
                    .setPopup(new mapboxgl.Popup({ offset: 15, closeButton: false }).setHTML(popupHTML))
                    .addTo(map.current!);

                warningMarkersRef.current.push(marker);
            });

            // Fly to Lonavala for alerts
            map.current.flyTo({
                center: [73.4068, 18.7537],
                zoom: 13,
                duration: 1500
            });
        }
    }, [mode]);

    // Auto-open/close Directions when mode changes
    useEffect(() => {
        if (mode === 'routing' && !isDirectionsOpen) {
            openDirections();
        } else if (mode !== 'routing' && isDirectionsOpen) {
            closeDirections();
        }
    }, [mode]);


    const openDirections = () => {
        if (isDirectionsOpen || !map.current) return;
        setIsDirectionsOpen(true);
        // Custom Oracle routing is now triggered by map click or search
    };

    // Helper: Haversine distance in meters between two [lng, lat] coords
    const haversineDistance = (a: [number, number], b: [number, number]): number => {
        const toRad = (v: number) => (v * Math.PI) / 180;
        const R = 6371000;
        const dLat = toRad(b[1] - a[1]);
        const dLng = toRad(b[0] - a[0]);
        const sinDlat = Math.sin(dLat / 2);
        const sinDlng = Math.sin(dLng / 2);
        const h = sinDlat * sinDlat + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * sinDlng * sinDlng;
        return 2 * R * Math.asin(Math.sqrt(h));
    };

    // Min distance from a point to the route polyline
    const distanceFromRoute = (pos: [number, number], coords: [number, number][]): number => {
        if (coords.length === 0) return 0;
        let min = Infinity;
        for (const coord of coords) {
            const d = haversineDistance(pos, coord);
            if (d < min) min = d;
        }
        return min;
    };

    // Find closest vertex index on route polyline
    const closestRouteIndex = (pos: [number, number], coords: [number, number][]): number => {
        let minDist = Infinity;
        let minIdx = 0;
        coords.forEach((coord, i) => {
            const d = haversineDistance(pos, coord);
            if (d < minDist) { minDist = d; minIdx = i; }
        });
        return minIdx;
    };

    const startNavigation = () => {
        const activeRoute = candidateRoutesRef.current.find(r => r.internalId === selectedRouteId);
        if (!map.current || !activeRoute) {
            console.error("Selected route not found for activation:", selectedRouteId);
            return;
        }

        console.log("Oracle Identity Binding Validation:");
        console.log(" - Selected ID:", selectedRouteId);
        console.log(" - Activating ID:", activeRoute.internalId);
        console.log(" - Risk Level:", activeRoute.recommendation);
        console.log(" - Risk Score:", activeRoute.riskScore);

        if (activeRoute.internalId !== selectedRouteId) {
            console.error("CRITICAL: Route Identity Mismatch! Aborting activation.");
            return;
        }

        const geom = polylineLib.decode(activeRoute.geometry).map(c => [c[1], c[0]] as [number, number]);

        frozenRouteRef.current = [...geom];
        navModeRef.current = 'ACTIVE';
        setNavMode('ACTIVE');
        deviationFiredRef.current = false;

        if (onNavStarted) {
            const destCoord = geom[geom.length - 1];
            const destName = destinationSearch || "Map Location";
            onNavStarted({ name: destName, coords: [destCoord[0], destCoord[1]] });
            // Persist route so it survives a reload
            sessionStorage.setItem(NAV_ROUTE_KEY, JSON.stringify({
                geometry: activeRoute.geometry,
                destination: destName,
                destCoords: [destCoord[0], destCoord[1]]
            }));
        }

        // Cleanup all candidate routes visually
        candidateRoutesRef.current.forEach((route) => {
            const id = `route-${route.internalId}`;
            if (map.current!.getLayer(`${id}-line`)) {
                map.current!.removeLayer(`${id}-line`);
            }
            if (map.current!.getSource(id)) {
                map.current!.removeSource(id);
            }
        });

        // Re-draw only the active safe route with peak prominence
        const activeId = `route-active-nav`;
        if (map.current.getSource(activeId)) map.current.removeSource(activeId);

        map.current.addSource(activeId, {
            type: 'geojson',
            data: polylineLib.toGeoJSON(activeRoute.geometry)
        });
        map.current.addLayer({
            id: `${activeId}-line`,
            type: 'line',
            source: activeId,
            paint: {
                'line-color': '#3b82f6',
                'line-width': 10,
                'line-opacity': 1
            }
        });

        // Draw the green "remaining route" layer for active monitoring
        if (map.current && frozenRouteRef.current.length > 0) {
            if (!map.current.getSource('remaining-route')) {
                map.current.addSource('remaining-route', {
                    type: 'geojson',
                    data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: frozenRouteRef.current } }
                });
                map.current.addLayer({
                    id: 'remaining-route',
                    type: 'line',
                    source: 'remaining-route',
                    paint: { 'line-color': '#22c55e', 'line-width': 5, 'line-opacity': 1 }
                });
            }
        }

        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                if (navModeRef.current !== 'ACTIVE') return;
                const userPos: [number, number] = [pos.coords.longitude, pos.coords.latitude];

                // Trim route: slice from closest point forward
                if (frozenRouteRef.current.length > 1 && map.current && map.current.getSource('remaining-route')) {
                    const idx = closestRouteIndex(userPos, frozenRouteRef.current);
                    const remaining = frozenRouteRef.current.slice(idx);
                    (map.current.getSource('remaining-route') as mapboxgl.GeoJSONSource).setData({
                        type: 'Feature', properties: {},
                        geometry: { type: 'LineString', coordinates: remaining.length > 1 ? remaining : [userPos, userPos] }
                    });
                }

                // Deviation detection — 40m threshold
                const dist = distanceFromRoute(userPos, frozenRouteRef.current);
                if (dist > 40 && !deviationFiredRef.current) {
                    deviationFiredRef.current = true;
                    if (onDeviation) onDeviation();
                    setTimeout(() => { deviationFiredRef.current = false; }, 30000);
                }
            },
            (err) => console.warn('Watch position error:', err),
            { enableHighAccuracy: true, maximumAge: 2000 }
        );
    };

    const exitNavigation = () => {
        // Stop location watching
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        // Remove active layers
        if (map.current) {
            if (map.current.getLayer('remaining-route')) map.current.removeLayer('remaining-route');
            if (map.current.getSource('remaining-route')) map.current.removeSource('remaining-route');
            if (map.current.getLayer('route-active-nav-line')) map.current.removeLayer('route-active-nav-line');
            if (map.current.getSource('route-active-nav')) map.current.removeSource('route-active-nav');
        }
        frozenRouteRef.current = [];
        navModeRef.current = 'PLANNING';
        setNavMode('PLANNING');
        clearAllRoutes();
        deviationFiredRef.current = false;
        // Clear persisted nav state
        sessionStorage.removeItem(NAV_ROUTE_KEY);
        sessionStorage.removeItem(NAV_SESSION_KEY);
        if (onNavExited) {
            onNavExited();
        }
    };

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
