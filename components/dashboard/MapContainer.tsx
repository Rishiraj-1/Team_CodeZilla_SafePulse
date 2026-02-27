import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions';
import '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css';
// Import custom overrides
import '@/styles/mapbox-directions.css';

import {
    initializeMap,
    addRiskLayer,
    getUserLocation,
    addLocationMarker
} from '@/services/mapService';

// Initialize mapbox token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

interface MapContainerProps {
    mode: 'default' | 'routing' | 'dangerZone' | 'guardianView';
    onRouteSelected?: (route: any) => void;
}

export const MapContainer: React.FC<MapContainerProps> = ({ mode }) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const directionsRef = useRef<typeof MapboxDirections | null>(null);

    const directionsContainerRef = useRef<HTMLDivElement>(null);
    const instructionsContainerRef = useRef<HTMLDivElement>(null);
    const observerRef = useRef<MutationObserver | null>(null);

    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [isDirectionsOpen, setIsDirectionsOpen] = useState(false);

    useEffect(() => {
        if (map.current) return;
        if (!mapContainer.current) return;

        const setupMap = async () => {
            let center: [number, number] = [75.8577, 22.7196]; // Default: Indore

            try {
                const location = await getUserLocation();
                center = location;
                setUserLocation(location);
            } catch (error) {
                console.warn('Location permission denied or error:', error);
                setPermissionDenied(true);
            }

            map.current = initializeMap(mapContainer.current!, center);

            map.current.on('load', () => {
                if (map.current) {
                    addRiskLayer(map.current);
                }
                if (userLocation && map.current) {
                    addLocationMarker(map.current, userLocation);
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (mode === 'routing' && !isDirectionsOpen) {
            openDirections();
        } else if (mode !== 'routing' && isDirectionsOpen) {
            closeDirections();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);

    const openDirections = () => {
        if (isDirectionsOpen || !map.current) return;

        setIsDirectionsOpen(true);

        const proximityCoords: [number, number] = userLocation
            ? userLocation
            : [75.8577, 22.7196];

        const directions = new MapboxDirections({
            accessToken: mapboxgl.accessToken,
            unit: 'metric',
            profile: 'mapbox/driving',
            interactive: true,
            controls: {
                inputs: true,
                instructions: true,
                profileSwitcher: false
            },
            flyTo: true,
            proximity: proximityCoords,
            geocoder: {
                proximity: proximityCoords,
            },
            placeholderOrigin: 'Your location',
            placeholderDestination: 'Search destination…',
        });

        directionsRef.current = directions;

        const ctrlElement = directions.onAdd(map.current);
        if (directionsContainerRef.current) {
            directionsContainerRef.current.appendChild(ctrlElement);
        }

        if (directionsContainerRef.current && instructionsContainerRef.current) {
            const instructionsTarget = instructionsContainerRef.current;

            observerRef.current = new MutationObserver(() => {
                const instructionsEl = directionsContainerRef.current?.querySelector(
                    '.directions-control.directions-control-directions'
                );
                if (instructionsEl && instructionsEl.parentElement !== instructionsTarget) {
                    instructionsTarget.appendChild(instructionsEl);
                }
            });

            observerRef.current.observe(directionsContainerRef.current, {
                childList: true,
                subtree: true,
            });
        }

        if (userLocation) {
            directions.setOrigin(userLocation);
        } else {
            directions.setOrigin([75.8577, 22.7196]);
        }
    };

    const closeDirections = () => {
        if (observerRef.current) {
            observerRef.current.disconnect();
            observerRef.current = null;
        }

        if (instructionsContainerRef.current && directionsContainerRef.current) {
            const instructionsEl = instructionsContainerRef.current.querySelector(
                '.directions-control.directions-control-directions'
            );
            if (instructionsEl) {
                const ctrlEl = directionsContainerRef.current.querySelector('.mapboxgl-ctrl-directions');
                if (ctrlEl) {
                    ctrlEl.appendChild(instructionsEl);
                }
            }
        }

        if (directionsRef.current && map.current) {
            directionsRef.current.onRemove(map.current);
            directionsRef.current = null;
            setIsDirectionsOpen(false);
        }
    };

    return (
        <div className="relative h-screen w-screen">
            <div ref={mapContainer} className="h-full w-full" />

            {permissionDenied && (
                <div className="absolute top-4 left-4 z-10 glass rounded-xl p-4 max-w-xs border-l-4 border-amber-500/50">
                    <p className="text-sm text-white/80 font-medium">Location access denied</p>
                    <p className="text-xs text-white/40 mt-1">Defaulting to City Center.</p>
                </div>
            )}

            <div
                ref={instructionsContainerRef}
                className={`safepulse-instructions-panel absolute top-4 right-4 z-30 transition-all duration-300 ${isDirectionsOpen ? '' : 'opacity-0 pointer-events-none'}`}
            />

            <div
                ref={directionsContainerRef}
                className={`safepulse-directions-wrapper absolute bottom-36 left-1/2 -translate-x-1/2 z-20 transition-all duration-300 ${isDirectionsOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}
            >
                {isDirectionsOpen && (
                    <button
                        onClick={closeDirections}
                        className="safepulse-directions-close"
                        title="Close Routing"
                    >
                        ✕
                    </button>
                )}
            </div>
        </div>
    );
};
