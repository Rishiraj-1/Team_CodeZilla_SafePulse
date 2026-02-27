import React from 'react';
import { ViewState } from '../types';

interface SafeRouteScreenProps {
  setView: (view: ViewState) => void;
}

export const SafeRouteScreen: React.FC<SafeRouteScreenProps> = ({ setView }) => {
  return (
    <div className="bg-background-light dark:bg-background-dark h-screen w-full flex flex-col relative overflow-hidden font-sans">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 bg-white/90 dark:bg-[#181022]/90 backdrop-blur-md px-6 py-4 flex items-center justify-between shadow-sm border-b border-gray-200 dark:border-gray-700">
         <div className="flex items-center gap-4">
             <button onClick={() => setView(ViewState.CITIZEN_DASHBOARD)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                <span className="material-symbols-outlined dark:text-white">arrow_back</span>
             </button>
             <h2 className="text-lg font-bold text-[#130d1b] dark:text-white">Safe Route Navigation</h2>
         </div>
         <div className="flex items-center gap-2">
             <span className="hidden md:inline text-sm font-medium text-safe-green bg-safe-green/10 px-3 py-1 rounded-full border border-safe-green/20">
                <span className="material-symbols-outlined text-sm align-middle mr-1">verified_user</span> Safe Path
             </span>
         </div>
      </header>

      {/* Map Content */}
      <div className="absolute inset-0 z-0 bg-gray-100">
          <div className="absolute inset-0 bg-[url('https://lh3.googleusercontent.com/aida-public/AB6AXuAu1WinW6uhtVpRrCVk1GPL_pynAHtlC_eamq11YFTAAApgMf01SMUIr08SNIHr97BvAMh3aMGEB7ZqCFtfASS70OQGrbB5VMT-5cYnnb9cz6_p5Yl78T6jJgTQxqZzrjOTZjrcxsQJWOzUjnYD0fSqOMXBaG6m9bAzXgpYjcKXFzPjnf3A3dAMOqveI_HrJEqHmB0dSu5pLzYyeQqnrAeL7Ut2r887Qo4SY04hBwNABTO_K9xnY9VEZnhDGIRzhL0kwepDp9wznPA')] bg-cover bg-center opacity-60 mix-blend-multiply"></div>
          
          {/* SVG Overlay */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" xmlns="http://www.w3.org/2000/svg">
             <defs>
               <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                 <feGaussianBlur stdDeviation="4" result="blur" />
                 <feComposite in="SourceGraphic" in2="blur" operator="over" />
               </filter>
             </defs>
             {/* Path */}
             <path d="M 320 300 Q 450 300 500 450 T 800 600 T 1100 550" fill="none" stroke="#2ECC71" strokeWidth="8" strokeLinecap="round" filter="url(#glow)" className="opacity-60" />
             <path d="M 320 300 Q 450 300 500 450 T 800 600 T 1100 550" fill="none" stroke="#2ECC71" strokeWidth="4" strokeLinecap="round" strokeDasharray="10 10" className="animate-[dash_1s_linear_infinite]" />
             
             {/* Start */}
             <circle cx="320" cy="300" r="8" fill="white" stroke="#130d1b" strokeWidth="4" />
             
             {/* Guardians */}
             <g transform="translate(600, 480)">
                <circle cx="0" cy="0" r="14" fill="white" stroke="#b889f5" strokeWidth="2" className="opacity-90 animate-pulse" />
                <text x="-12" y="12" className="material-symbols-outlined text-primary" fontSize="24">security</text>
             </g>
          </svg>
      </div>

      {/* Floating UI */}
      <div className="absolute top-20 left-4 md:left-6 z-10 w-full max-w-sm pointer-events-none">
          <div className="glass-panel p-4 rounded-xl shadow-lg pointer-events-auto">
             <div className="flex flex-col gap-3">
                 <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center py-1">
                        <div className="w-3 h-3 border-2 border-black rounded-full bg-white"></div>
                        <div className="w-0.5 h-8 bg-gray-300 border-l border-dashed border-gray-400"></div>
                        <span className="material-symbols-outlined text-primary">location_on</span>
                    </div>
                    <div className="flex-1 flex flex-col gap-3">
                        <div className="bg-gray-50 p-2 rounded text-sm text-gray-600 border border-gray-200">Rajwada Palace</div>
                        <div className="bg-white p-2 rounded text-sm font-bold border border-primary/30 shadow-sm flex justify-between items-center">
                            <span>Vijay Nagar Square</span>
                            <span className="text-xs text-gray-400">3.2km</span>
                        </div>
                    </div>
                 </div>
                 
                 <div className="flex gap-2 mt-1">
                    <span className="px-2 py-1 bg-primary/10 text-primary-dark text-xs font-bold rounded-md flex items-center gap-1"><span className="material-symbols-outlined text-xs">verified_user</span> Safe</span>
                    <span className="px-2 py-1 bg-white border border-gray-200 text-gray-600 text-xs font-medium rounded-md flex items-center gap-1"><span className="material-symbols-outlined text-xs">bolt</span> Well-lit</span>
                 </div>
             </div>
          </div>
      </div>

      {/* Bottom Panel */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-6 flex justify-center pointer-events-none">
         <div className="glass-panel w-full max-w-3xl rounded-2xl shadow-2xl p-4 flex flex-col md:flex-row items-center gap-6 pointer-events-auto">
             <div className="flex-1 flex justify-between w-full md:w-auto px-4">
                 <div>
                     <p className="text-xs text-gray-500 font-bold uppercase">Est. Time</p>
                     <div className="flex items-baseline gap-1">
                         <span className="text-3xl font-black text-[#130d1b] dark:text-white">12</span>
                         <span className="text-sm font-bold text-gray-600">min</span>
                     </div>
                 </div>
                 <div className="w-px h-10 bg-gray-200 dark:bg-gray-700"></div>
                 <div>
                     <p className="text-xs text-gray-500 font-bold uppercase">Safety Score</p>
                     <div className="flex items-center gap-2">
                         <span className="text-2xl font-bold text-safe-green">9.2</span>
                         <span className="text-xs font-medium text-gray-400">/ 10</span>
                     </div>
                 </div>
                 <div className="w-px h-10 bg-gray-200 dark:bg-gray-700"></div>
                 <div>
                     <p className="text-xs text-gray-500 font-bold uppercase">Guardians</p>
                     <div className="flex items-center gap-2 mt-1">
                         <div className="flex -space-x-2">
                            {[1,2].map(i => (
                                <div key={i} className="size-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center overflow-hidden">
                                   <span className="material-symbols-outlined text-gray-400 text-lg">person</span>
                                </div>
                            ))}
                         </div>
                         <span className="text-sm font-bold text-[#130d1b] dark:text-white">3 Active</span>
                     </div>
                 </div>
             </div>
             
             <button className="w-full md:w-auto h-14 bg-primary hover:bg-primary-dark text-white rounded-xl px-8 flex items-center justify-center gap-3 shadow-lg shadow-primary/30 transition-all active:scale-95">
                <span className="material-symbols-outlined animate-bounce">navigation</span>
                <div className="flex flex-col items-start leading-none">
                    <span className="text-sm font-bold uppercase">Start</span>
                    <span className="text-xs opacity-80 font-medium">Navigation</span>
                </div>
             </button>
         </div>
      </div>
    </div>
  );
};