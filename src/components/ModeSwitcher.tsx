import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '../context/AuthContext';

interface NavButtonProps {
    path: string;
    icon: string;
    label: string;
    regexMatch: RegExp;
    colorClass: string;
    glowClass: string;
    bgColorClass: string;
}

export const ModeSwitcher: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const currentPath = location.pathname;

    const renderButton = ({ path, icon, label, regexMatch, colorClass, glowClass, bgColorClass }: NavButtonProps) => {
        const isActive = regexMatch.test(currentPath);

        return (
            <button
                key={path}
                onClick={() => navigate(path)}
                className={`
                    relative h-full px-6 rounded-full flex items-center justify-center gap-2 transition-all duration-300
                    ${isActive
                        ? `${bgColorClass} text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_0_15px_${glowClass}] border border-${colorClass}/30`
                        : 'text-white/70 hover:text-white hover:bg-white/5 border border-transparent'
                    }
                `}
            >
                <span className="material-symbols-outlined text-[18px] leading-none">{icon}</span>
                <span className="text-xs font-bold uppercase tracking-wide leading-none hidden sm:block pt-[1px]">{label}</span>
                {isActive && <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-${colorClass} blur-[2px]`}></div>}
            </button>
        );
    };

    const getButtonsForRole = (role?: UserRole): NavButtonProps[] => {
        const btns: NavButtonProps[] = [];

        // Base styling mapping
        const sCitizen = { colorClass: 'primary', glowClass: 'rgba(109,40,217,0.3)', bgColorClass: 'bg-primary/20' };
        const sGuardian = { colorClass: 'blue-500', glowClass: 'rgba(59,130,246,0.3)', bgColorClass: 'bg-blue-500/20' };
        const sReport = { colorClass: 'rose-500', glowClass: 'rgba(244,63,94,0.3)', bgColorClass: 'bg-rose-500/20' };
        const sAdmin = { colorClass: 'orange-500', glowClass: 'rgba(249,115,22,0.3)', bgColorClass: 'bg-orange-500/20' };
        const sAuthority = { colorClass: 'emerald-500', glowClass: 'rgba(16,185,129,0.3)', bgColorClass: 'bg-emerald-500/20' };

        if (!role) return [];

        if (role === 'citizen') {
            btns.push({ path: '/app/citizen', icon: 'person', label: 'Citizen', regexMatch: /\/citizen/, ...sCitizen });
            btns.push({ path: '/app/report', icon: 'report', label: 'Report', regexMatch: /\/report/, ...sReport });
        } else if (role === 'guardian') {
            btns.push({ path: '/app/guardian', icon: 'security', label: 'Guardian Dashboard', regexMatch: /\/guardian/, ...sGuardian });
            btns.push({ path: '/app/report', icon: 'report', label: 'Report', regexMatch: /\/report/, ...sReport });
        } else if (role === 'authority') {
            btns.push({ path: '/app/authority', icon: 'dashboard', label: 'Dashboard', regexMatch: /\/authority/, ...sAuthority });
            btns.push({ path: '/app/sos-alerts', icon: 'emergency', label: 'SOS Alerts', regexMatch: /\/sos-alerts/, ...sReport });
            btns.push({ path: '/app/risk-zones', icon: 'map', label: 'Risk Zones', regexMatch: /\/risk-zones/, ...sAdmin });
            btns.push({ path: '/app/report', icon: 'report', label: 'Report', regexMatch: /\/report/, ...sReport });
        } else if (role === 'admin') {
            btns.push({ path: '/app/admin', icon: 'admin_panel_settings', label: 'Admin', regexMatch: /\/admin$/, ...sAdmin });
            btns.push({ path: '/app/manage-authority', icon: 'manage_accounts', label: 'Manage Authorities', regexMatch: /\/manage-authority/, ...sCitizen });
        }

        return btns;
    };

    const buttons = getButtonsForRole(user?.role);

    if (buttons.length === 0) return null;

    return (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[55] transition-all duration-500 w-full max-w-fit px-4">
            <div
                className="h-14 flex items-center p-1 rounded-full backdrop-blur-3xl bg-[rgba(40,40,50,0.45)] border border-[rgba(255,255,255,0.08)] shadow-[0_8px_30px_rgba(0,0,0,0.25)] relative overflow-hidden group/container"
                style={{
                    boxShadow: '0 8px 30px rgba(0,0,0,0.25), 0 0 60px rgba(140, 90, 255, 0.05)'
                }}
            >
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none rounded-full"></div>

                {buttons.map((btn, index) => (
                    <React.Fragment key={btn.path}>
                        {renderButton(btn)}
                        {index < buttons.length - 1 && <div className="w-px h-5 bg-white/10 mx-1"></div>}
                    </React.Fragment>
                ))}

                <div className="w-px h-5 bg-white/10 mx-1"></div>
                <button
                    onClick={async () => {
                        await logout();
                        navigate('/');
                    }}
                    className="relative h-full px-4 rounded-full flex items-center justify-center gap-2 transition-all duration-300 text-white/50 hover:text-red-400 hover:bg-red-400/10 border border-transparent"
                    title="Logout"
                >
                    <span className="material-symbols-outlined text-[18px] leading-none">logout</span>
                    <span className="text-xs font-bold uppercase tracking-wide leading-none hidden sm:block pt-[1px]">Exit</span>
                </button>
            </div>
        </div>
    );
};
