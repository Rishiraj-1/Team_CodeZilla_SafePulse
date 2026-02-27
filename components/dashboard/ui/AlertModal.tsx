import React from 'react';
import { motion } from 'framer-motion';

interface AlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    children?: React.ReactNode;
    actions?: React.ReactNode;
}

const backdrop = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
};

const modal = {
    hidden: { opacity: 0, scale: 0.96, y: 12 },
    visible: { opacity: 1, scale: 1, y: 0 },
};

const transition = { duration: 0.4, ease: [0.4, 0, 0.2, 1] };

export const AlertModal: React.FC<AlertModalProps> = ({
    isOpen,
    onClose,
    title,
    description,
    children,
    actions,
}) => {
    if (!isOpen) return null;

    return (
        <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-auto"
            variants={backdrop}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={transition}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <motion.div
                className="relative glass-panel rounded-[var(--sp-radius-lg)] p-8 max-w-md w-full mx-6 glow-v"
                style={{ borderColor: 'rgba(183, 135, 245, 0.12)' }}
                variants={modal}
                initial="hidden"
                animate="visible"
                exit="hidden"
                transition={transition}
            >
                {title && (
                    <h2 className="text-lg font-bold tracking-tight text-white mb-2">{title}</h2>
                )}
                {description && (
                    <p className="sp-body mb-6">{description}</p>
                )}
                {children}
                {actions && (
                    <div className="flex gap-3 mt-6">
                        {actions}
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
};
