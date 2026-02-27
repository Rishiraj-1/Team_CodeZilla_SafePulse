import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { MapContainer } from './MapContainer';
import { ModeSwitcher } from './ModeSwitcher';
import { useAuth } from '../context/AuthContext';

export type AppMapMode = 'default' | 'routing' | 'dangerZone' | 'guardianView' | 'report' | 'alerts';
export type RoutingProfile = 'mapbox/driving' | 'mapbox/walking';

const NAV_STORAGE_KEY = 'safepulse_nav_session';

interface NavSession {
    mapMode: AppMapMode;
    navState: 'PLANNING' | 'ACTIVE';
    routingProfile: RoutingProfile;
    activeDestination: { name: string; coords: [number, number] } | null;
}

export const GlobalLayout: React.FC = () => {
    // Restore from sessionStorage on first render
    const savedRaw = sessionStorage.getItem(NAV_STORAGE_KEY);
    const saved: NavSession | null = savedRaw ? JSON.parse(savedRaw) : null;

    const [mapMode, setMapMode] = useState<AppMapMode>(saved?.mapMode ?? 'default');
    const [routingProfile, setRoutingProfile] = useState<RoutingProfile>(saved?.routingProfile ?? 'mapbox/driving');
    const [clickedLocation, setClickedLocation] = useState<[number, number] | null>(null);
    const [deviationTriggered, setDeviationTriggered] = useState(false);
    const [navState, setNavState] = useState<'PLANNING' | 'ACTIVE'>(saved?.navState ?? 'PLANNING');
    const [activeDestination, setActiveDestination] = useState<{ name: string; coords: [number, number] } | null>(
        saved?.activeDestination ?? null
    );
    const location = useLocation();
    const { user } = useAuth();

    // Persist nav session to sessionStorage whenever relevant state changes
    useEffect(() => {
        const session: NavSession = { mapMode, navState, routingProfile, activeDestination };
        sessionStorage.setItem(NAV_STORAGE_KEY, JSON.stringify(session));
    }, [mapMode, navState, routingProfile, activeDestination]);

    const handleNavExited = () => {
        setNavState('PLANNING');
        setActiveDestination(null);
        // Clear persisted session so a fresh reload starts clean
        sessionStorage.removeItem(NAV_STORAGE_KEY);
    };

    return (
        <div className="relative w-full h-screen overflow-hidden bg-gray-900">
            {/* 1. PERSISTENT MAP LAYER */}
            <MapContainer
                mode={mapMode}
                routingProfile={routingProfile}
                onMapClick={setClickedLocation}
                onClose={() => setMapMode('default')}
                onDeviation={() => setDeviationTriggered(true)}
                onNavStarted={(dest) => { setNavState('ACTIVE'); setActiveDestination(dest); }}
                onNavExited={handleNavExited}
            />

            {/* 2. GLOBAL UI LAYER */}
            <div className="absolute inset-0 pointer-events-none z-10 flex flex-col">
                <div className="pointer-events-auto">
                    <ModeSwitcher />
                </div>
                <div className="flex-1 relative pointer-events-none">
                    <Outlet context={{
                        mapMode, setMapMode,
                        routingProfile, setRoutingProfile,
                        clickedLocation,
                        deviationTriggered, setDeviationTriggered,
                        navState, activeDestination
                    }} />
                </div>
            </div>
        </div>
    );
};
