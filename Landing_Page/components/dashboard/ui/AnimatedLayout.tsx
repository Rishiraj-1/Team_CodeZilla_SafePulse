import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

interface AnimatedLayoutProps {
    children: React.ReactNode;
}

const pageVariants = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -6 },
};

const pageTransition = {
    duration: 0.5,
    ease: [0.4, 0, 0.2, 1],
};

export const AnimatedLayout: React.FC<AnimatedLayoutProps> = ({ children }) => {
    const location = useLocation();

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={location.pathname}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
                className="absolute inset-0"
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
};
