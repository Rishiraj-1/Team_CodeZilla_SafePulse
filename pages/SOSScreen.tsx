import React, { useEffect, useState } from 'react';
import { ViewState } from '../types';

interface SOSScreenProps {
  setView: (view: ViewState) => void;
}

export const SOSScreen: React.FC<SOSScreenProps> = ({ setView }) => {
  const [countdown, setCountdown] = useState(5);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setActive(true);
    }
  }, [countdown]);

  return (
    <div className="bg-background-light dark:bg-background-dark h-screen w-full relative flex flex-col overflow-hidden">
      {/* Background with blur */}
      <div className="absolute inset-0 z-0">
         <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDMo45_jTAUTIhHEgoHfvpU81rKq0MuOSEkXE4UnbEOkfHodh4bl3zQZJbG0-Jo_FeU9NGItwexeduNSy4q3X0FJ28wSfjOO4N0GGIdIVSCcKWEJGbXJWhmlOgnCBWzFOOvK0QR5CmBiaWydoYVSz4Hessf-hNhnZipYexLuT45KU22GkRaLQBX22oN7ISckuFpUpRlIaQw9UXBE0HYxlrvLGRMaB7XhWBppXzG0iPzCftGmHWOqPJH0fthL8fnjLzHa_AQbwGmaxU" className="w-full h-full object-cover grayscale blur-sm" alt="Map Background" />
         <div className="absolute inset-0 bg-white/60 dark:bg-black/80"></div>
      </div>

      <header className="relative z-10 flex items-center justify-between p-6 bg-white/80 dark:bg-black/60 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
         <div className="flex items-center gap-3">
             <div className="size-8 bg-danger-red rounded-lg flex items-center justify-center text-white">
                 <span className="material-symbols-outlined">e911_emergency</span>
             </div>
             <h1 className="text-xl font-bold text-danger-red">EMERGENCY MODE</h1>
         </div>
         <button className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300">
            <span className="material-symbols-outlined">settings</span>
         </button>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 gap-8">
         <div className="w-full max-w-lg">
             <div className={`bg-danger-red text-white rounded-2xl shadow-2xl p-8 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-500 ${active ? 'scale-105 shadow-red-500/50' : ''}`}>
                 {active && <div className="absolute inset-0 bg-white/10 animate-pulse"></div>}
                 
                 <div className="flex items-center gap-4 mb-4">
                    <span className="material-symbols-outlined text-5xl animate-bounce">sos</span>
                    <h2 className="text-4xl font-black tracking-widest">SOS ACTIVE</h2>
                 </div>
                 <p className="text-white/90 text-center font-medium">Emergency protocols initiated.</p>
             </div>
         </div>

         <div className="bg-white dark:bg-[#231a33] rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8 w-full max-w-lg flex flex-col items-center">
             <div className="relative flex items-center justify-center size-48 mb-6">
                 {/* Spinner rings */}
                 <div className="absolute inset-0 border-4 border-gray-100 dark:border-gray-800 rounded-full"></div>
                 <div className={`absolute inset-0 border-4 border-danger-red rounded-full border-t-transparent ${countdown > 0 ? 'animate-spin' : ''}`}></div>
                 
                 <div className="flex flex-col items-center z-10">
                    <span className="text-7xl font-black text-[#130d1b] dark:text-white tabular-nums">
                        {countdown > 0 ? `0${countdown}` : 'OK'}
                    </span>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-2">
                        {countdown > 0 ? 'Seconds' : 'Sent'}
                    </span>
                 </div>
             </div>

             <div className="w-full space-y-3">
                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-100 dark:border-gray-700">
                   <div className="relative">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping"></span>
                      <div className="relative size-10 bg-primary/20 text-primary rounded-full flex items-center justify-center">
                         <span className="material-symbols-outlined">my_location</span>
                      </div>
                   </div>
                   <div>
                      <p className="text-xs font-bold text-primary uppercase">Live Location Shared</p>
                      <p className="text-sm font-medium dark:text-white">22.7196° N, 75.8577° E</p>
                   </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-100 dark:border-gray-700">
                   <div className="size-10 bg-gray-200 dark:bg-gray-700 text-gray-500 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined">contact_phone</span>
                   </div>
                   <div className="flex-1">
                      <p className="text-xs font-bold text-gray-500 uppercase">Emergency Contacts</p>
                      <p className="text-sm font-medium dark:text-white">Notifying 3 contacts...</p>
                   </div>
                   {active && <span className="material-symbols-outlined text-safe-green">check_circle</span>}
                </div>
             </div>
         </div>

         <button 
           onClick={() => setView(ViewState.CITIZEN_DASHBOARD)}
           className="w-full max-w-lg bg-white dark:bg-[#231a33] border-2 border-gray-200 dark:border-gray-700 hover:border-danger-red hover:text-danger-red text-gray-600 dark:text-gray-300 font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all"
         >
            <span className="material-symbols-outlined">cancel</span>
            <span>Cancel (False Alarm)</span>
         </button>
      </main>
    </div>
  );
};