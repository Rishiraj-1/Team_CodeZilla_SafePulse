import React from 'react';
import { ViewState } from '../types';

interface NavigationSwitcherProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
}

export const NavigationSwitcher: React.FC<NavigationSwitcherProps> = ({ currentView, setView }) => {

  // Determine current mode for styling
  const isCitizen = currentView === ViewState.CITIZEN_DASHBOARD || currentView === ViewState.CITIZEN_SAFE_ROUTE || currentView === ViewState.CITIZEN_SOS || currentView === ViewState.CITIZEN_GUARDIAN_REQUEST;
  const isGuardian = currentView === ViewState.GUARDIAN_DASHBOARD;
  const isAdmin = currentView === ViewState.ADMIN_DASHBOARD;

  // Dynamic Positioning (Citizen: top-6, Others: top-20 to clear header)
  // Global fixed positioning (always top-6)
  return (
    <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[55] transition-all duration-500 w-full max-w-fit px-4">
      <div
        className="h-14 flex items-center p-1 rounded-full backdrop-blur-3xl bg-[rgba(40,40,50,0.45)] border border-[rgba(255,255,255,0.08)] shadow-[0_8px_30px_rgba(0,0,0,0.25)] relative overflow-hidden group/container"
        style={{
          boxShadow: '0 8px 30px rgba(0,0,0,0.25), 0 0 60px rgba(140, 90, 255, 0.05)' // Detailed shadow stack
        }}
      >

        {/* Inner Highlight Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none rounded-full"></div>

        {/* CITIZEN MODE */}
        <button
          onClick={() => setView(ViewState.CITIZEN_DASHBOARD)}
          className={`
            relative h-full px-6 rounded-full flex items-center justify-center gap-2 transition-all duration-300
            ${isCitizen
              ? 'bg-primary/20 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_0_15px_rgba(109,40,217,0.3)] border border-primary/30'
              : 'text-white/70 hover:text-white hover:bg-white/5 border border-transparent'
            }
          `}
        >
          <span className="material-symbols-outlined text-[18px] leading-none">person</span>
          <span className="text-xs font-bold uppercase tracking-wide leading-none hidden sm:block pt-[1px]">Citizen</span>
          {isCitizen && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-primary blur-[2px]"></div>}
        </button>

        <div className="w-px h-5 bg-white/10 mx-1"></div>

        {/* GUARDIAN MODE */}
        <button
          onClick={() => setView(ViewState.GUARDIAN_DASHBOARD)}
          className={`
            relative h-full px-6 rounded-full flex items-center justify-center gap-2 transition-all duration-300
            ${isGuardian
              ? 'bg-blue-500/20 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_0_15px_rgba(59,130,246,0.3)] border border-blue-500/30'
              : 'text-white/70 hover:text-white hover:bg-white/5 border border-transparent'
            }
          `}
        >
          <span className="material-symbols-outlined text-[18px] leading-none">security</span>
          <span className="text-xs font-bold uppercase tracking-wide leading-none hidden sm:block pt-[1px]">Guardian</span>
          {isGuardian && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-blue-500 blur-[2px]"></div>}
        </button>

        <div className="w-px h-5 bg-white/10 mx-1"></div>

        {/* ADMIN MODE */}
        <button
          onClick={() => setView(ViewState.ADMIN_DASHBOARD)}
          className={`
            relative h-full px-6 rounded-full flex items-center justify-center gap-2 transition-all duration-300
            ${isAdmin
              ? 'bg-orange-500/20 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_0_15px_rgba(249,115,22,0.3)] border border-orange-500/30'
              : 'text-white/70 hover:text-white hover:bg-white/5 border border-transparent'
            }
          `}
        >
          <span className="material-symbols-outlined text-[18px] leading-none">admin_panel_settings</span>
          <span className="text-xs font-bold uppercase tracking-wide leading-none hidden sm:block pt-[1px]">Admin</span>
          {isAdmin && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-orange-500 blur-[2px]"></div>}
        </button>

      </div>
    </div>
  );
};