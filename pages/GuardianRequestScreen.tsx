import React from 'react';
import { ViewState } from '../types';

interface GuardianRequestScreenProps {
  setView: (view: ViewState) => void;
}

export const GuardianRequestScreen: React.FC<GuardianRequestScreenProps> = ({ setView }) => {
  return (
    <div className="bg-background-light dark:bg-background-dark font-sans text-charcoal dark:text-white h-screen flex flex-col overflow-hidden relative">
       {/* Map Background */}
       <div className="absolute inset-0 z-0 bg-gray-200">
           <div className="w-full h-full bg-cover bg-center opacity-60 mix-blend-multiply" style={{backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuD8a5Rdanet0q-f4hLUEcXv4QH4otri22To2-Njeh07QGTqLx745OCL1zzaOJWSRzQLNkFDWKeLMqmUBudWn86-ukKQvlptNszCJib_pNW2NqXDcxSnLigoGtrHobAzOxDEy2qtuGtF6tm-B_1V-jmr7Z6jnpE6W4_RY9nYKajtSGoDqTtg6qGS2k4A5zhP-V_qeE1U6jXrhbJNb--1en_8u5y1NP_pJZWZ8j63ME4XYMaHXR5UwViqLuWOBXqMbnjd1Xl4vAEeySc')"}}></div>
           
           {/* Markers */}
           <div className="absolute top-1/2 left-[55%] transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
               <div className="relative flex items-center justify-center">
                   <div className="w-12 h-12 bg-primary/20 rounded-full animate-ping absolute"></div>
                   <div className="w-4 h-4 bg-primary rounded-full border-2 border-white shadow-lg z-10"></div>
               </div>
               <div className="mt-2 bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-md text-xs font-bold whitespace-nowrap">Rahul V.</div>
           </div>
           
           <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
               <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-xl"></div>
               <div className="absolute mt-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">You</div>
           </div>
           
           <button onClick={() => setView(ViewState.CITIZEN_DASHBOARD)} className="absolute top-6 left-6 z-20 bg-white dark:bg-gray-800 p-2 rounded-full shadow-lg hover:bg-gray-100">
              <span className="material-symbols-outlined">arrow_back</span>
           </button>
       </div>

       {/* Sidebar Overlay */}
       <div className="relative z-10 w-full md:w-[480px] h-full bg-white/95 dark:bg-background-dark/95 backdrop-blur-sm border-r border-gray-100 dark:border-gray-800 shadow-xl flex flex-col">
           <div className="p-6 border-b border-gray-100 dark:border-gray-700">
               <div className="flex items-center gap-2 text-primary mb-2">
                   <span className="material-symbols-outlined text-sm">location_on</span>
                   <span className="text-xs font-bold uppercase tracking-wider">Current Location: Palasia Square</span>
               </div>
               <h1 className="text-2xl font-bold mb-2">Request Accompaniment</h1>
               <p className="text-gray-500 text-sm">Select a verified guardian nearby to walk with you.</p>
           </div>

           <div className="flex-1 overflow-y-auto p-4 space-y-4">
               {/* Guardian Card 1 */}
               <div className="group relative bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border-2 border-primary shadow-sm cursor-pointer transition-all">
                   <div className="absolute -top-3 right-4 bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">Best Match</div>
                   <div className="flex items-start gap-4">
                       <div className="relative">
                           <div className="w-16 h-16 rounded-full bg-cover bg-center border-2 border-white dark:border-gray-700 shadow-sm" style={{backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDwimXwyy1zIchIiY640o_aepRmBmdQGHm7nhWPiIJX7cZguiyxcftaW1-_WJD6DDcMGHto-NYSrhunT6KuY0yWyTF8QSOt7UMk4SeDwvWG5LU15lBw3PzTo_MltP65mo5G8ziJf5Dudo-Q1VJpXIeUKpigXAqXRSMmINkR_EhHIl-vyhr_QoHQRS_diYsGvQRVhjtBiN04YsMAniIkZXfS6fJepzmtsPJTY1d-0IvG-fY1z9iENeSXF9LsemqxJw6zqRdD11AxFIg')"}}></div>
                           <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-800 rounded-full p-0.5 shadow-sm">
                               <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
                           </div>
                       </div>
                       <div className="flex-1">
                           <div className="flex justify-between items-start">
                               <div>
                                   <h3 className="font-bold text-lg">Rahul Verma</h3>
                                   <div className="flex items-center gap-1 text-yellow-500 text-sm mt-0.5">
                                       <span className="material-symbols-outlined text-sm">star</span>
                                       <span className="font-bold">4.9</span>
                                       <span className="text-gray-400 font-normal">(125 reviews)</span>
                                   </div>
                               </div>
                               <div className="text-right">
                                   <p className="text-primary font-bold text-lg">3 min</p>
                                   <p className="text-gray-500 text-xs">0.2 km</p>
                               </div>
                           </div>
                           <div className="mt-3 flex gap-2">
                               <span className="inline-flex items-center px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300">
                                   <span className="material-symbols-outlined text-[14px] mr-1">local_police</span> Verified
                               </span>
                               <span className="inline-flex items-center px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300">
                                   <span className="material-symbols-outlined text-[14px] mr-1">translate</span> English/Hindi
                               </span>
                           </div>
                       </div>
                   </div>
               </div>

               {/* Guardian Card 2 */}
               <div className="group bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:border-primary/50 cursor-pointer transition-all">
                   <div className="flex items-start gap-4">
                       <div className="relative">
                           <div className="w-16 h-16 rounded-full bg-cover bg-center border border-gray-200" style={{backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDc1hPk011YGXPiCMmawZMnOmBi5gZ21HMig_XLFzR9aCiE7vkyN1gRgmFKYHpvJEYBpPYWPTl7l6QaB9A8CasaPalydYWJLtX9-3z9navxxtK9QZoNlmEJ8pFaYE8hMFIyJurXGhiez8VtRHGzEhKgjUAIY4p6lDxbQy4w4JLhTO91BrY5RLKgxCbbaaU00g8FvShFBLfHnHDQYrTQo3TTwWrD2sid2Zqazl3br1rQgrUGPAFezOikEw_2_KQoHsy3DSAnDCiZPVw')"}}></div>
                       </div>
                       <div className="flex-1">
                           <div className="flex justify-between items-start">
                               <div>
                                   <h3 className="font-bold text-lg">Priya Singh</h3>
                                   <div className="flex items-center gap-1 text-yellow-500 text-sm mt-0.5">
                                       <span className="material-symbols-outlined text-sm">star</span>
                                       <span className="font-bold">4.8</span>
                                       <span className="text-gray-400 font-normal">(98 reviews)</span>
                                   </div>
                               </div>
                               <div className="text-right">
                                   <p className="font-bold text-lg">7 min</p>
                                   <p className="text-gray-500 text-xs">0.5 km</p>
                               </div>
                           </div>
                           <div className="mt-3 flex gap-2">
                               <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-400">
                                   <span className="material-symbols-outlined text-[14px] mr-1">female</span> Female Only
                               </span>
                           </div>
                       </div>
                   </div>
               </div>
           </div>

           <div className="p-6 border-t border-gray-100 dark:border-gray-700">
               <button className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2">
                   <span>Request Guardian Accompaniment</span>
                   <span className="material-symbols-outlined">arrow_forward</span>
               </button>
           </div>
       </div>
    </div>
  );
};