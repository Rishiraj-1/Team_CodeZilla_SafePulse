import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { MapContainer } from './MapContainer';
import { ModeSwitcher } from './ModeSwitcher';

const pageTransition = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -6 },
};

export const GlobalLayout: React.FC = () => {
    const [mapMode, setMapMode] = useState<'default' | 'routing' | 'dangerZone' | 'guardianView'>('default');
    const location = useLocation();

    return (
        <div className="relative w-full h-screen overflow-hidden" style={{ background: '#050505' }}>
            {/* Ambient violet glow */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute -top-[40%] -right-[20%] w-[600px] h-[600px] rounded-full bg-[#b787f5] opacity-[0.02] blur-[120px] animate-ambient" />
                <div className="absolute -bottom-[30%] -left-[15%] w-[500px] h-[500px] rounded-full bg-[#b787f5] opacity-[0.015] blur-[100px] animate-ambient" style={{ animationDelay: '3s' }} />
            </div>

            <MapContainer mode={mapMode} />
            <ModeSwitcher />

            <AnimatePresence mode="wait">
                <motion.div
                    key={location.pathname}
                    className="absolute inset-0 pointer-events-none z-10 flex flex-col"
                    variants={pageTransition}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                >
                    <Outlet context={{ setMapMode }} />
                </motion.div>
            </AnimatePresence>
        </div>
    );
};
