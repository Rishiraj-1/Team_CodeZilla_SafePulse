import mapboxgl from 'mapbox-gl';

// Replace with your actual token or env variable
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

const DEFAULT_CENTER: [number, number] = [73.4068, 18.7537]; // Lonavala
const API = import.meta.env.VITE_API_URL ?? '';

// --- Location Services ---

export interface MapUserItem {
    id: string;
    lat: number;
    lng: number;
    name: string;
    status: string;
}

export const fetchMapData = async (authorityId?: string) => {
    try {
        const token = localStorage.getItem('safepulse_auth_token');
        const url = authorityId
            ? `${API}/api/map-data?authority_id=${authorityId}`
            : `${API}/api/map-data`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch map data');
        return await response.json();
    } catch (error) {
        console.error("fetchMapData error:", error);
        return { citizens: [], guardians: [], authorities: [] };
    }
};

export const getUserLocation = (): Promise<[number, number]> => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
        }

        const doRequest = (opts: PositionOptions, isRetry = false) => {
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve([pos.coords.longitude, pos.coords.latitude]),
                (error) => {
                    const isRetryable = error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE;
                    if (!isRetry && isRetryable) {
                        // Wait 1.5s for Core Location to warm up, then retry
                        setTimeout(() => {
                            doRequest({ enableHighAccuracy: false, timeout: 20000, maximumAge: 0 }, true);
                        }, 1500);
                    } else {
                        reject(error);
                    }
                },
                opts
            );
        };

        doRequest({ enableHighAccuracy: false, timeout: 15000, maximumAge: 0 });
    });
};

export const initializeMap = (container: string, center: [number, number] = DEFAULT_CENTER) => {
    // Rough bounding box for India: [West Lng, South Lat, East Lng, North Lat]
    const INDIA_BOUNDS: [number, number, number, number] = [68.111378, 6.755698, 97.395561, 35.674520];

    return new mapboxgl.Map({
        container,
        style: 'mapbox://styles/mapbox/dark-v11', // Dark mode for SafePulse
        center,
        zoom: 14,
        pitch: 45,
        bearing: -17.6,
        antialias: true,
        maxBounds: INDIA_BOUNDS // Completely locks map panning out of India
    });
};

export const addLocationMarker = (map: mapboxgl.Map, lngLat: [number, number]) => {
    // Create a DOM element for the marker
    const el = document.createElement('div');
    el.className = 'user-location-marker';
    el.style.width = '20px';
    el.style.height = '20px';
    el.style.backgroundColor = '#10b981'; // Safe Green
    el.style.borderRadius = '50%';
    el.style.border = '2px solid #ffffff';
    el.style.boxShadow = '0 0 10px rgba(16, 185, 129, 0.5)';
    el.style.cursor = 'pointer';

    // Add a pulse effect (requires CSS, but we can do inline style for simple pulse if needed, 
    // or better yet, just a clean static marker for now to ensure stability)

    new mapboxgl.Marker(el)
        .setLngLat(lngLat)
        .addTo(map);

    // Fly to location
    map.flyTo({
        center: lngLat,
        zoom: 15,
        essential: true,
        speed: 1.2
    });
};

// Global marker storage mapped to user ID 
const activeMarkers: { [id: string]: mapboxgl.Marker } = {};

export const syncUserMarkers = (
    map: mapboxgl.Map,
    users: MapUserItem[],
    color: string
) => {
    // Basic sync: right now we'll just clear old ones by role, but since it's grouped, 
    // it's easier to just draw and clean up. A simpler approach for hackathon: return an array of created markers.
    const markers: mapboxgl.Marker[] = [];

    users.forEach(u => {
        const el = document.createElement('div');
        el.className = 'user-marker';
        el.style.width = '14px';
        el.style.height = '14px';
        el.style.backgroundColor = color;
        el.style.borderRadius = '50%';
        el.style.border = '2px solid #fff';
        el.style.boxShadow = `0 0 8px ${color}`;
        el.title = `${u.name} (${u.status})`;

        const marker = new mapboxgl.Marker(el)
            .setLngLat([u.lng, u.lat])
            .setPopup(new mapboxgl.Popup({ offset: 15 }).setHTML(`<div class="text-black text-xs font-bold p-1">${u.name}</div>`))
            .addTo(map);

        markers.push(marker);
    });

    return markers;
};

// --- Routing Services ---

export const fetchRoutes = async (start: [number, number], end: [number, number]): Promise<any[]> => {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=polyline&overview=full&alternatives=true&steps=true&access_token=${mapboxgl.accessToken}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const json = await response.json();

        if (!json.routes || json.routes.length === 0) {
            throw new Error('No routes found');
        }

        return json.routes;
    } catch (error) {
        console.error('Error fetching routes:', error);
        throw error;
    }
};

export const scoreRoute = async (polyline: string) => {
    try {
        const token = localStorage.getItem('safepulse_auth_token');
        const response = await fetch(`${API}/api/route/score`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ polyline })
        });
        if (!response.ok) throw new Error('Failed to score route');
        return await response.json();
    } catch (error) {
        console.error("scoreRoute error:", error);
        return { recommendation: 'SAFE', route_risk_score: 0 };
    }
};

export const drawRoute = (map: mapboxgl.Map, geojson: any) => {
    // Clean up existing route first
    clearRoute(map);

    if (map.getSource('route')) {
        (map.getSource('route') as mapboxgl.GeoJSONSource).setData({
            type: 'Feature',
            properties: {},
            geometry: geojson
        });
    } else {
        map.addSource('route', {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {},
                geometry: geojson
            }
        });
    }

    if (!map.getLayer('route-line')) {
        map.addLayer({
            id: 'route-line',
            type: 'line',
            source: 'route',
            layout: {
                'line-join': 'round',
                'line-cap': 'round',
                'visibility': 'visible'
            },
            paint: {
                'line-color': '#a855f7', // SafePulse Purple
                'line-width': 6,
                'line-opacity': 0.85
            }
        });
    }

    // Fit bounds to route
    const coordinates = geojson.coordinates;
    const bounds = new mapboxgl.LngLatBounds(
        coordinates[0],
        coordinates[0]
    );

    for (const coord of coordinates) {
        bounds.extend(coord);
    }

    map.fitBounds(bounds, {
        padding: 50
    });
};

export const clearRoute = (map: mapboxgl.Map) => {
    if (map.getLayer('route-line')) {
        map.removeLayer('route-line');
    }
    if (map.getSource('route')) {
        map.removeSource('route');
    }
};

// --- Dynamic Risk & Safe Zones ---
import { fetchRedZones, fetchBaselineRisk } from './api';

export const addSafetyZones = async (map: mapboxgl.Map, center: [number, number], city: string = 'Lonavala') => {
    // 1. Fetch real data from backend
    const [dynamicRiskZones, baselineRiskData] = await Promise.all([
        fetchRedZones(),
        fetchBaselineRisk(city)
    ]);

    // Calculate baseline intensity
    const totalBaselineScore = baselineRiskData.reduce((sum, item) => sum + item.weighted_score, 0);
    // Let's assume a typical city max score is around 500 for normalization.
    const normalizedBaseline = Math.min(totalBaselineScore / 500, 1.0);

    /*
     * 🧠 SafePulse Risk Model Concept
     * 
     * 1. Structural Risk (Baseline)
     *    - Represents long-term, established patterns of risk based on government/NCRB data.
     *    - Visualized as a low-opacity, broad violet heatmap.
     *    - Changes slowly.
     * 
     * 2. Situational Risk (Dynamic)
     *    - Represents real-time, immediate threats based on verified user reports.
     *    - Visualized as intense, strong red zones.
     *    - Overrides baseline risk in priority when rendering because live danger 
     *      supersedes historical data.
     * 
     * Combined Visualization:
     *    We render both layers independently. The dynamic layer is placed visually
     *    above the baseline layer to ensure immediate threats stand out clearly
     *    against the structural background risk.
     */

    // --- 1. BASELINE LAYER (VIOLET/PURPLE) ---
    // Generate a grid of points for the baseline layer to cover the city evenly
    const baselineFeatures: any[] = [];
    // Lonavala center for baseline grid spreading
    const lonavalaCenter = [73.4068, 18.7537];
    const spread = 0.05; // Roughly 5km spacing

    for (let i = -2; i <= 2; i++) {
        for (let j = -2; j <= 2; j++) {
            baselineFeatures.push({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [lonavalaCenter[0] + (i * spread), lonavalaCenter[1] + (j * spread)] },
                properties: { intensity: Math.max(0.1, normalizedBaseline) }
            });
        }
    }


    // Baseline heatmap removed — was producing non-geographic glowing rings.
    // Clean up if it was previously added.
    if (map.getLayer('baseline-risk-heat')) map.removeLayer('baseline-risk-heat');
    if (map.getSource('baseline-risk-zones')) map.removeSource('baseline-risk-zones');


    // --- 2. DYNAMIC RISK LAYER (geographic polygon circles) ---
    // Helper: create a GeoJSON circle polygon from a center coord + radius in meters
    const makeCirclePolygon = (lng: number, lat: number, radiusMeters: number, points = 64): any => {
        const km = radiusMeters / 1000;
        const distX = km / (111.320 * Math.cos(lat * Math.PI / 180));
        const distY = km / 110.574;
        const coords = [];
        for (let i = 0; i < points; i++) {
            const theta = (i / points) * 2 * Math.PI;
            coords.push([lng + distX * Math.cos(theta), lat + distY * Math.sin(theta)]);
        }
        coords.push(coords[0]); // close ring
        return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: {} };
    };

    // Build individual polygon sources per zone so they each stay geographically accurate
    dynamicRiskZones.forEach((z: any) => {
        // Use radius from backend if provided, otherwise match mock zone sizes (200m HIGH, 150m MEDIUM, 100m LOW)
        const radiusMeters = z.radius || (z.risk_level === 'HIGH' ? 200 : z.risk_level === 'MEDIUM' ? 150 : 100);
        // All zones use red — brighter for HIGH, slightly muted for MEDIUM/LOW
        const color = z.risk_level === 'HIGH' ? '#ef4444' : z.risk_level === 'MEDIUM' ? '#f87171' : '#fca5a5';
        const fillOpacity = z.risk_level === 'HIGH' ? 0.30 : 0.20;
        const outlineOpacity = z.risk_level === 'HIGH' ? 0.9 : 0.6;
        const sourceId = `dyn-risk-${z.id ?? (z.latitude + '-' + z.longitude)}`;
        const polygon = makeCirclePolygon(z.longitude, z.latitude, radiusMeters);

        if (map.getSource(sourceId)) {
            (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData({ type: 'FeatureCollection', features: [polygon] });
        } else {
            map.addSource(sourceId, { type: 'geojson', data: { type: 'FeatureCollection', features: [polygon] } });
            // Fill layer
            map.addLayer({
                id: `${sourceId}-fill`,
                type: 'fill',
                source: sourceId,
                paint: {
                    'fill-color': color,
                    'fill-opacity': fillOpacity
                }
            });
            // Outline layer
            map.addLayer({
                id: `${sourceId}-outline`,
                type: 'line',
                source: sourceId,
                paint: {
                    'line-color': color,
                    'line-width': 1.5,
                    'line-opacity': outlineOpacity
                }
            });
        }
    });

    // Remove old heatmap source if it exists from a previous render
    if (map.getLayer('risk-heat')) map.removeLayer('risk-heat');
    if (map.getSource('risk-zones')) map.removeSource('risk-zones');


    // --- SAFE LAYER (GREEN/CYAN) ---
    const safeFeatures: any[] = [];
    if (map.getSource('safe-zones')) {
        (map.getSource('safe-zones') as mapboxgl.GeoJSONSource).setData({ type: 'FeatureCollection', features: safeFeatures as any });
    } else {
        map.addSource('safe-zones', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: safeFeatures as any }
        });

        map.addLayer({
            id: 'safe-heat',
            type: 'heatmap',
            source: 'safe-zones',
            paint: {
                'heatmap-weight': ['get', 'intensity'],
                'heatmap-intensity': 1,
                'heatmap-color': [
                    'interpolate',
                    ['linear'],
                    ['heatmap-density'],
                    0, 'rgba(0,0,0,0)',
                    0.4, 'rgba(16, 185, 129, 0.3)', // Emerald Green
                    1, 'rgba(16, 185, 129, 0.8)'
                ],
                'heatmap-radius': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    10, 12,
                    15, 90
                ],
                'heatmap-opacity': 0.6
            }
        });
    }
};

// --- Safety Infrastructure (Police / Hospital / Fire Station from OSM) ---

// In-memory cache so Overpass is only hit once per session
let _safetySpotCache: GeoJSON.FeatureCollection | null = null;

const LONAVALA_BBOX = '18.70,73.36,18.82,73.48'; // south,west,north,east — Lonavala

function osmAmenityLabel(amenity: string | undefined): string {
    switch (amenity) {
        case 'police': return 'Police Station';
        case 'hospital': return 'Hospital';
        case 'fire_station': return 'Fire Station';
        default: return 'Safety Facility';
    }
}

async function fetchSafetySpots(): Promise<GeoJSON.FeatureCollection> {
    if (_safetySpotCache) return _safetySpotCache;

    const overpassQuery = `[out:json][timeout:25];
(
  node["amenity"~"police|hospital|fire_station"](${LONAVALA_BBOX});
  way["amenity"~"police|hospital|fire_station"](${LONAVALA_BBOX});
);
out center;`;

    const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(overpassQuery)}`
    });

    if (!res.ok) throw new Error(`Overpass API error: ${res.status}`);
    const osmData = await res.json();

    const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: (osmData.elements as any[]).map(el => ({
            type: 'Feature' as const,
            geometry: {
                type: 'Point' as const,
                coordinates: [
                    el.lon ?? el.center?.lon ?? 0,
                    el.lat ?? el.center?.lat ?? 0
                ]
            },
            properties: {
                id: el.id,
                name: el.tags?.name || el.tags?.['name:en'] || osmAmenityLabel(el.tags?.amenity),
                amenity: el.tags?.amenity || 'unknown'
            }
        })).filter(f => (f.geometry.coordinates as number[])[0] !== 0)
    };

    _safetySpotCache = geojson;
    return geojson;
}

export const addSafetySpots = async (map: mapboxgl.Map): Promise<void> => {
    try {
        const geojson = await fetchSafetySpots();

        // Update data if source exists
        if (map.getSource('safety-spots')) {
            (map.getSource('safety-spots') as mapboxgl.GeoJSONSource).setData(geojson);
            return;
        }

        map.addSource('safety-spots', { type: 'geojson', data: geojson });

        // Colored circle background per amenity type
        map.addLayer({
            id: 'safety-spots-circle',
            type: 'circle',
            source: 'safety-spots',
            paint: {
                'circle-radius': 8,
                'circle-color': [
                    'match', ['get', 'amenity'],
                    'police', '#3b82f6',
                    'hospital', '#10b981',
                    'fire_station', '#f97316',
                    '#6b7280'
                ] as any,
                'circle-stroke-color': '#ffffff',
                'circle-stroke-width': 1.5,
                'circle-opacity': 0.9
            }
        });

        // Maki icon + label layer
        map.addLayer({
            id: 'safety-spots-symbol',
            type: 'symbol',
            source: 'safety-spots',
            layout: {
                'icon-image': [
                    'match', ['get', 'amenity'],
                    'police', 'police-15',
                    'hospital', 'hospital-15',
                    'fire_station', 'fire-station-15',
                    'marker-15'
                ] as any,
                'icon-size': 1.0,
                'icon-allow-overlap': true,
                'text-field': ['get', 'name'] as any,
                'text-size': 10,
                'text-offset': [0, 1.6],
                'text-anchor': 'top',
                'text-max-width': 8,
                'text-optional': true,
                'text-allow-overlap': false
            } as any,
            paint: {
                'text-color': '#ffffff',
                'text-halo-color': '#000000',
                'text-halo-width': 1
            }
        });

        // Click → popup
        map.on('click', 'safety-spots-circle', (e) => {
            if (!e.features?.length) return;
            const props = e.features[0].properties as any;
            const coords = (e.features[0].geometry as GeoJSON.Point).coordinates as [number, number];
            new mapboxgl.Popup({ offset: 14, closeButton: false })
                .setLngLat(coords)
                .setHTML(`
                    <div style="background:#111827;color:#fff;padding:10px 14px;border-radius:10px;font-size:12px;min-width:150px;border:1px solid rgba(255,255,255,0.1);">
                        <div style="font-weight:700;font-size:13px;margin-bottom:2px;">${props.name}</div>
                        <div style="color:#9ca3af;text-transform:uppercase;font-size:10px;letter-spacing:0.08em;">${osmAmenityLabel(props.amenity)}</div>
                    </div>
                `)
                .addTo(map);
        });

        map.on('mouseenter', 'safety-spots-circle', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'safety-spots-circle', () => { map.getCanvas().style.cursor = ''; });

        console.log(`SafePulse OSM: loaded ${geojson.features.length} safety infrastructure spots`);
    } catch (err) {
        console.warn('SafePulse: Could not load OSM safety spots –', err);
    }
};
