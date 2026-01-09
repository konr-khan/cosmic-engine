import React, { useState } from 'react';
import { Sun, RotateCw } from 'lucide-react';

// Hooks
import { useCosmicEngine } from './hooks/useCosmicEngine';

// Visualizations
import PhaseVisual from './components/PhaseVisual';
import SunClock from './components/SunClock';
import TerminatorMap from './components/TerminatorMap';
import TideDashboard from './components/TideDashboard';
import AnnualChart from './components/AnnualChart';

// Controls
import CosmicChronometer from './components/controls/Inputs';

export default function App() {
  // ==========================================
  // 1. APP STATE
  // ==========================================
  const [currentDate, setCurrentDate] = useState(new Date(2023, 5, 21));
  const [latitude, setLatitude] = useState(51.5);
  const [longitude, setLongitude] = useState(0);
  const [timeOfDay, setTimeOfDay] = useState(12);
  
  // View States
  const [widgets, setWidgets] = useState({ tides: true, daylight: true, map: true });
  const [useAnalemma, setUseAnalemma] = useState(true);

  // ==========================================
  // 2. ENGINE HOOK
  // ==========================================
  const { solarData, orbitalData, annualData } = useCosmicEngine(
    currentDate, 
    timeOfDay, 
    latitude, 
    longitude, 
    useAnalemma
  );

  // Helpers
  const dayOfYear = Math.floor((currentDate - new Date(currentDate.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
  const handleDateSlider = (val) => setCurrentDate(new Date(currentDate.getFullYear(), 0, val));
  const toggleWidget = (key) => setWidgets(prev => ({ ...prev, [key]: !prev[key] }));

  // ==========================================
  // 3. RENDER
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans overflow-x-hidden">
      
      <div className="max-w-7xl mx-auto p-4 md:p-8 pb-32 space-y-12">
        
        {/* ---------------------------------- */}
        {/* SECTION 1: GLOBAL CONTEXT (MAP)    */}
        {/* ---------------------------------- */}
        {widgets.map && (
          <div className="w-full h-96 min-h-[350px] rounded-3xl overflow-hidden shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-500">
            <TerminatorMap 
              solarData={solarData} 
              latitude={latitude} 
              longitude={longitude} 
              timeOfDay={timeOfDay} 
            />
          </div>
        )}

        {/* ---------------------------------- */}
        {/* SECTION 2: THE CORE (CHRONOMETER)  */}
        {/* ---------------------------------- */}
        {/* Centered "Hero" placement between Map and Data */}
        <div className="flex justify-center w-full">
            <div className="w-full max-w-lg transform hover:scale-[1.02] transition-transform duration-300">
                <CosmicChronometer 
                  date={currentDate} 
                  time={timeOfDay} 
                  lat={latitude} 
                  lon={longitude} 
                  onDateChange={setCurrentDate}
                  onTimeChange={setTimeOfDay}
                  onLatChange={setLatitude}
                  onLonChange={setLongitude}
                  widgets={widgets}
                  toggleWidget={toggleWidget}
                  className="shadow-2xl ring-4 ring-slate-100" // Adds a nice 'inset' feel on the light background
                />
            </div>
        </div>

        {/* ---------------------------------- */}
        {/* SECTION 3: LOCAL DATA GRID         */}
        {/* ---------------------------------- */}
        <div className={`grid grid-cols-1 gap-8 ${widgets.daylight && widgets.tides ? 'xl:grid-cols-2' : ''}`}>
          
          {/* Module A: Daylight Physics */}
          {widgets.daylight && (
            <div className="space-y-4 animate-in slide-in-from-bottom-8 duration-700 delay-100">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest px-1">
                <Sun className="w-4 h-4" /> Module A: Daylight Physics
              </div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-5">
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center h-full min-h-[300px]">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 w-full text-left flex items-center gap-2">
                      <Sun className="w-4 h-4" /> Daily Cycle
                    </h2>
                    <SunClock solarData={solarData} currentTime={timeOfDay} latitude={latitude} />
                  </div>
                </div>
                <div className="md:col-span-7 h-full min-h-[300px]">
                  {/* UPDATED: Now uses latitude instead of annualData */}
                  <AnnualChart 
                    latitude={latitude} 
                    currentDay={dayOfYear} 
                    onDayChange={handleDateSlider} 
                  />
                </div>
              </div>
            </div>
          )}

          {/* Module B: Orbital Physics */}
          {widgets.tides && (
            <div className="space-y-4 animate-in slide-in-from-bottom-8 duration-700 delay-200">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest px-1">
                <RotateCw className="w-4 h-4" /> Module B: Orbital Physics
              </div>
              <div className="space-y-6">
                <div className="bg-slate-900 rounded-2xl shadow-lg border border-slate-800 p-6 text-white flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-2">Current Phase</span>
                    <span className="text-3xl font-bold text-blue-100 mb-1">{orbitalData.phase.name}</span>
                    <span className="text-sm text-slate-400 font-mono">{(orbitalData.phase.value * 100).toFixed(1)}% Illuminated</span>
                  </div>
                  <div className={`flex-shrink-0 ml-6 transform scale-110 transition-transform duration-500 ${latitude < 0 ? 'rotate-180' : ''}`}>
                    <PhaseVisual phase={orbitalData.phase.value} />
                  </div>
                </div>
                <TideDashboard orbitalData={orbitalData} />
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}