import React, { useMemo } from 'react';
import { Sun } from 'lucide-react';
import { toRadians, toDegrees, formatTime } from '../utils/astronomy';

// --- Configuration ---
const CONFIG = {
  RADIUS: 90,
  CENTER: 110,
  // "Magic numbers" for the layout
  SUN_PATH_RADIUS: 60, // Radius of the little sun icon's path
  SUN_ICON_OFFSET_X: 80,
  SUN_ICON_OFFSET_Y: 70,
};

const COLORS = {
  NIGHT_BG: "#1e293b", // Slate 800
  NIGHT_STROKE: "#334155", // Slate 700
  ASTRO: "#4338ca", // Indigo 700
  NAUTICAL: "#3b82f6", // Blue 500
  CIVIL: "#f87171", // Red 400
  DAY: "#fbbf24", // Amber 400
  HAND: "#ffffff",
};

export default function SunClock({ solarData, currentTime, latitude }) {

  // 1. Memoize the geometry generator to fix the "24-hour bug"
  const getSectorPath = (hours) => {
    const { CENTER: cx, CENTER: cy, RADIUS: r } = CONFIG;

    // Guard clauses
    if (typeof hours !== 'number' || isNaN(hours) || hours <= 0) return "";

    // BUG FIX: Standard SVG arcs fail if start == end (24 hours).
    // If >= 24h, draw two semi-circles to form a full circle.
    if (hours >= 24) {
      return `M ${cx} ${cy - r} A ${r} ${r} 0 1 0 ${cx} ${cy + r} A ${r} ${r} 0 1 0 ${cx} ${cy - r} Z`;
    }

    const angle = (hours * 15) / 2; // Half the total angle spread
    const startAngle = -90 - angle; // Top dead center is -90 degrees
    const endAngle = -90 + angle;

    const startRad = toRadians(startAngle);
    const endRad = toRadians(endAngle);

    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);

    const largeArcFlag = hours > 12 ? 1 : 0;

    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  // 2. Memoize solar calculations
  const sunData = useMemo(() => {
    if (!solarData) return null;

    const { solarNoon, declination } = solarData;
    
    // Rotation: High noon is at top (12 o'clock), but 0 degrees is right (3 o'clock).
    // If solarNoon is 13:00, the wheel must rotate -15 degrees to put 13:00 at the top.
    const rotationAngle = (solarNoon - 12) * 15;

    // Current Sun Position Math (Simplified for readability)
    const hourAngle = (currentTime - solarNoon) * 15;
    
    // Elevation Formula (Asin(Sin(Lat)*Sin(Dec) + Cos(Lat)*Cos(Dec)*Cos(HA)))
    const sinAlt = Math.sin(toRadians(latitude)) * Math.sin(toRadians(declination)) + 
                   Math.cos(toRadians(latitude)) * Math.cos(toRadians(declination)) * Math.cos(toRadians(hourAngle));
    const currentElevation = toDegrees(Math.asin(sinAlt));

    // Cartesian position for the little sun icon
    const sunX = CONFIG.SUN_ICON_OFFSET_X + CONFIG.SUN_PATH_RADIUS * Math.sin(toRadians(hourAngle));
    // Inverting Y because SVG Y grows downwards
    const sunY = CONFIG.SUN_ICON_OFFSET_Y - CONFIG.SUN_PATH_RADIUS * Math.sin(toRadians(currentElevation));

    return { 
      rotationAngle, 
      currentElevation, 
      sunX, 
      sunY,
      clockHandAngle: (currentTime - 12) * 15 - 90 
    };
  }, [solarData, currentTime, latitude]);

  if (!solarData || !sunData) return null;

  const { dayLength, civil, nautical, astronomical, noonElevation, solarNoon, equationOfTime, isPolarNight, isMidnightSun, sunrise, sunset } = solarData;
  const { rotationAngle, currentElevation, sunX, sunY, clockHandAngle } = sunData;
  const { CENTER, RADIUS } = CONFIG;

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative">
        <svg width="220" height="220" className="drop-shadow-lg" aria-label="24-hour sun clock">
          {/* Base Dial */}
          <circle cx={CENTER} cy={CENTER} r={RADIUS + 5} fill={COLORS.NIGHT_BG} stroke={COLORS.NIGHT_STROKE} strokeWidth="1" />
          <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="#0f172a" stroke={COLORS.NIGHT_STROKE} strokeWidth="2" />

          {/* Daylight Wedges (Rotated by Solar Noon) */}
          <g transform={`rotate(${rotationAngle}, ${CENTER}, ${CENTER})`}>
            {/* The order matters: Largest to smallest to layer them correctly */}
            <path d={getSectorPath(astronomical)} fill={COLORS.ASTRO} opacity="0.3" />
            <path d={getSectorPath(nautical)} fill={COLORS.NAUTICAL} opacity="0.4" />
            <path d={getSectorPath(civil)} fill={COLORS.CIVIL} opacity="0.5" />
            <path d={getSectorPath(dayLength)} fill={COLORS.DAY} opacity="0.8" />
            {/* Solar Noon Line */}
            <line x1={CENTER} y1={CENTER - RADIUS} x2={CENTER} y2={CENTER - RADIUS + 10} stroke={COLORS.DAY} strokeWidth="2" />
          </g>

          {/* Hour Markers (Static 0, 6, 12, 18) */}
          {[0, 6, 12, 18].map(h => {
             const rad = toRadians((h - 12) * 15 - 90);
             return (
               <line 
                 key={h} 
                 x1={CENTER + 85 * Math.cos(rad)} 
                 y1={CENTER + 85 * Math.sin(rad)} 
                 x2={CENTER + 90 * Math.cos(rad)} 
                 y2={CENTER + 90 * Math.sin(rad)} 
                 stroke="#64748b" 
                 strokeWidth="2" 
               />
             );
          })}

          {/* Current Time Hand */}
          <line 
            x1={CENTER} y1={CENTER} 
            x2={CENTER + RADIUS * Math.cos(toRadians(clockHandAngle))} 
            y2={CENTER + RADIUS * Math.sin(toRadians(clockHandAngle))} 
            stroke={COLORS.HAND} 
            strokeWidth="2" 
            strokeLinecap="round" 
          />
          <circle cx={CENTER} cy={CENTER} r="4" fill={COLORS.HAND} />
          
          {/* 12:00 UTC Reference Label */}
          <text x={CENTER} y={CENTER - RADIUS - 12} textAnchor="middle" className="text-[10px] fill-slate-500 font-bold">12:00 UTC</text>
          
          {/* Center Info Hub */}
          <circle cx={CENTER} cy={CENTER} r="42" fill="white" className="drop-shadow-sm opacity-95" />
          <text x={CENTER} y={CENTER - 5} textAnchor="middle" className="text-xl font-bold fill-amber-500 font-mono tracking-tight">
            {isMidnightSun ? "MIDNIGHT" : isPolarNight ? "POLAR" : `${Math.floor(dayLength)}h ${Math.round((dayLength - Math.floor(dayLength)) * 60)}m`}
          </text>
          <text x={CENTER} y={CENTER + 10} textAnchor="middle" className="text-[7px] font-bold fill-amber-500 uppercase tracking-widest">
            {isMidnightSun ? "SUN" : isPolarNight ? "NIGHT" : "HOURS OF SUNLIGHT"}
          </text>
        </svg>
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-2 gap-3 w-full mt-4">
        {['Sunrise', 'Sunset'].map((label, i) => (
          <div key={label} className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex flex-col items-center shadow-sm">
            <span className="text-[10px] text-slate-400 font-bold uppercase">{label}</span>
            <span className="text-sm font-mono font-bold text-slate-700">
               {/* Handle edge cases where sunrise/set might be null in polar regions */}
               {isMidnightSun ? "---" : isPolarNight ? "---" : formatTime(i === 0 ? sunrise : sunset)}
            </span>
          </div>
        ))}
        
        {/* Elevation Graph */}
        <div className="col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col items-center shadow-sm">
          <div className="w-full flex justify-between items-center mb-1 px-2">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Elevation</div>
            <div className="text-[10px] font-bold text-slate-500">Max: {noonElevation.toFixed(1)}°</div>
          </div>
          <svg width="100%" height="80" viewBox="0 0 160 80" className="overflow-visible" preserveAspectRatio="xMidYMid meet">
            {/* Horizon Line */}
            <line x1="10" y1={70} x2="150" y2={70} stroke="#94a3b8" strokeWidth="2" />
            {/* Solar Path Arch */}
            <path d="M 20 70 A 60 60 0 0 1 140 70" fill="none" stroke="#e2e8f0" strokeDasharray="4 4" />
            
            {/* Current Sun Indicator */}
            {currentElevation > -18 && ( // Show sun if it's at least near horizon
              <g>
                 {/* Dashed line to sun */}
                <line x1={80} y1={70} x2={sunX} y2={sunY} stroke="#fcd34d" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
                {/* Observer center point */}
                <circle cx={80} cy={70} r="3" fill="#64748b" />
                {/* Sun Icon */}
                <g transform={`translate(${sunX - 10}, ${sunY - 10})`}>
                  <Sun className={`w-5 h-5 ${currentElevation > 0 ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                </g>
              </g>
            )}
          </svg>
          <div className="text-center -mt-6 bg-white/80 px-2 rounded backdrop-blur-sm border border-slate-100">
            <div className="text-lg font-mono font-bold text-slate-800">{currentElevation.toFixed(1)}°</div>
          </div>
        </div>
      </div>
      
      {/* Footer Stats */}
      <div className="mt-3 w-full bg-slate-50 rounded-lg p-3 border border-slate-100 text-xs font-mono space-y-1 shadow-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Eq. of Time:</span>
          <span className={`${equationOfTime > 0 ? 'text-indigo-600' : 'text-orange-600'} font-bold`}>
            {equationOfTime > 0 ? '+' : ''}{equationOfTime.toFixed(2)} min
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Solar Noon (Loc):</span>
          <span className="text-slate-700 font-bold">{formatTime(solarNoon)} UTC</span>
        </div>
      </div>
    </div>
  );
}