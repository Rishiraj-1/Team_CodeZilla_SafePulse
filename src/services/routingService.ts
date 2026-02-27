/**
 * @deprecated This service is replaced by @mapbox/mapbox-gl-directions plugin in MapContainer.tsx.
 * Kept for reference or future custom implementations.
 */
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';

// --- Types ---
export interface Route {
    id: string;
    geometry: any; // GeoJSON LineString
    duration: number; // seconds
    distance: number; // meters
    riskScore: number;
    type: 'fastest' | 'safest' | 'standard';
}

export interface DangerZone {
    type: 'Feature';
    properties: {
        severity: 'high' | 'medium' | 'low';
    };
    geometry: any; // GeoJSON Polygon
}

// --- Mock Danger Zones (Lonavala) ---
export const dangerZones: any = {
    type: "FeatureCollection",
    features: [
        {
            type: "Feature",
            properties: { severity: "high" },
            geometry: {
                type: "Polygon",
                coordinates: [[
                    [73.400, 18.748],
                    [73.410, 18.748],
                    [73.410, 18.740],
                    [73.400, 18.740],
                    [73.400, 18.748]
                ]]
            }
        },
        {
            type: "Feature",
            properties: { severity: "medium" },
            geometry: {
                type: "Polygon",
                coordinates: [[
                    [73.415, 18.762],
                    [73.425, 18.762],
                    [73.425, 18.754],
                    [73.415, 18.754],
                    [73.415, 18.762]
                ]]
            }
        }
    ]
};

// --- Risk Severity Weights ---
const RISK_WEIGHTS = {
    high: 50,
    medium: 20,
    low: 5
};

// --- 1. Get Current Location ---
export const getCurrentLocation = (): Promise<[number, number]> => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve([position.coords.longitude, position.coords.latitude]);
            },
            (error) => {
                reject(error);
            },
            { enableHighAccuracy: true }
        );
    });
};

// --- 2. Calculate Risk Score ---
export const calculateRouteRisk = (routeGeometry: any): number => {
    let score = 0;
    const routeLine = turf.lineString(routeGeometry.coordinates);

    dangerZones.features.forEach((zone: DangerZone) => {
        const zonePoly = turf.polygon(zone.geometry.coordinates);

        // Check intersection
        if (turf.booleanIntersects(routeLine, zonePoly)) {
            // Calculate length of simple intersection or just simple hit
            // For MVP: Simple hit adds penalty based on severity
            score += RISK_WEIGHTS[zone.properties.severity] || 0;

            // Advanced: Calculate length inside zone for more granular score
            // const intersection = turf.lineIntersect(routeLine, zonePoly);
            // if (intersection) ...
        }
    });

    return score;
};

// --- 3. Fetch Routes from Mapbox ---
export const fetchSmartRoutes = async (
    origin: [number, number],
    destination: [number, number]
): Promise<Route[]> => {
    const accessToken = mapboxgl.accessToken;
    if (!accessToken) throw new Error("Mapbox Token missing");

    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?alternatives=true&geometries=geojson&overview=full&access_token=${accessToken}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!data.routes || data.routes.length === 0) {
            throw new Error("No routes found");
        }

        // Process each route
        const processedRoutes: Route[] = data.routes.map((mapboxRoute: any, index: number) => {
            const risk = calculateRouteRisk(mapboxRoute.geometry);
            return {
                id: `route-${index}`,
                geometry: mapboxRoute.geometry,
                duration: mapboxRoute.duration,
                distance: mapboxRoute.distance,
                riskScore: risk,
                type: 'standard' // Placeholder, determined next
            };
        });

        // Determine Fastest & Safest
        // Fastest: user lowest duration
        const fastest = processedRoutes.reduce((prev, curr) => prev.duration < curr.duration ? prev : curr);

        // Safest: user lowest risk score
        const safest = processedRoutes.reduce((prev, curr) => prev.riskScore < curr.riskScore ? prev : curr);

        // Mark types
        processedRoutes.forEach(r => {
            if (r.id === fastest.id) r.type = 'fastest';
            // Safest overrides fastest if they are different, or we can have dual labels
            if (r.id === safest.id) {
                // If safest is also fastest, it's just 'fastest' (optimal) usually, 
                // but requirement says "If safest equals fastest -> mark as optimal"
                // Let's mark as 'safest' if it's safest, effectively upgrading it.
                // Or keep separate flags. Let's use string type for rendering logic.
                r.type = 'safest';
            }
            if (r.id === fastest.id && r.id === safest.id) {
                r.type = 'safest'; // "Optimal" visually typically same as safest preference
            }
        });

        return processedRoutes;

    } catch (error) {
        console.error("Error fetching routes:", error);
        throw error;
    }
};

// --- 4. Draw Routes on Map ---
export const drawSmartRoutes = (map: mapboxgl.Map, routes: Route[]) => {
    // Clear old layers
    clearSmartRoutes(map);

    // Sort: Standard first (bottom), then Fastest, then Safest (top)
    const sortedRoutes = [...routes].sort((a, b) => {
        const order = { 'standard': 0, 'fastest': 1, 'safest': 2 };
        return order[a.type] - order[b.type];
    });

    sortedRoutes.forEach(route => {
        const layerId = `route-layer-${route.type}-${route.id}`;
        const sourceId = `route-source-${route.id}`;

        // Add Source
        map.addSource(sourceId, {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {},
                geometry: route.geometry
            }
        });

        // Add Layer
        map.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': route.type === 'safest' ? '#8b5cf6' : '#9ca3af', // Purple vs Grey
                'line-width': route.type === 'safest' ? 6 : 4,
                'line-opacity': route.type === 'safest' ? 1.0 : 0.6
            }
        });
    });
};

// --- 6. Geocode Location (Address -> Coords) ---
export const geocodeLocation = async (query: string): Promise<{ coords: [number, number], placeName: string }> => {
    const accessToken = mapboxgl.accessToken;
    if (!accessToken) throw new Error("Mapbox Token missing");

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?limit=1&access_token=${accessToken}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!data.features || data.features.length === 0) {
            throw new Error("Location not found");
        }

        const feature = data.features[0];
        return {
            coords: feature.center as [number, number],
            placeName: feature.place_name
        };
    } catch (error) {
        console.error("Geocoding error:", error);
        throw error;
    }
};

// --- 7. Clear Routes ---
export const clearSmartRoutes = (map: mapboxgl.Map) => {
    const style = map.getStyle();
    if (!style || !style.layers) return;

    style.layers.forEach(layer => {
        if (layer.id.startsWith('route-layer-')) {
            map.removeLayer(layer.id);
        }
    });

    Object.keys(map.getStyle().sources || {}).forEach(sourceId => {
        if (sourceId.startsWith('route-source-')) {
            map.removeSource(sourceId);
        }
    });
};
