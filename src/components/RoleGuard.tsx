import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '../context/AuthContext';
import { isGuardianProfileComplete } from '../utils/guardianProfile';

interface RoleGuardProps {
    allowedRoles: UserRole[];
    children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
    const { user, isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return <div className="h-screen w-screen flex items-center justify-center bg-[#050505] text-white">Loading Auth...</div>;
    }

    if (!isAuthenticated || !user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (user.status === 'PENDING_VERIFICATION' && user.role !== 'admin') {
        return <Navigate to="/pending" replace />;
    }

    if (user.status === 'REJECTED' && user.role !== 'admin') {
        return <Navigate to="/rejected" replace />;
    }

    // Guardian must complete profile before accessing any app route
    if (user.role === 'guardian' && !isGuardianProfileComplete(user)) {
        return <Navigate to="/guardian/complete-profile" replace />;
    }

    if (!allowedRoles.includes(user.role)) {
        return <Navigate to={`/app/${user.role}`} replace />;
    }

    return <>{children}</>;
};

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return <div className="h-screen w-screen flex items-center justify-center bg-[#050505] text-white">Loading...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (user?.status === 'PENDING_VERIFICATION' && user?.role !== 'admin') {
        return <Navigate to="/pending" replace />;
    }

    if (user?.status === 'REJECTED' && user?.role !== 'admin') {
        return <Navigate to="/rejected" replace />;
    }

    return <>{children}</>;
};
