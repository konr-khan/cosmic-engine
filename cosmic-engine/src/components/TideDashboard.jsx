import React, { memo } from 'react';
import { Globe, ZoomIn } from 'lucide-react';
import PropTypes from 'prop-types'; // Optional, but good practice

// 1. Centralized Configuration
// Grouping colors and magic numbers makes the SVGs easier to tune later
const CONFIG = {
  COLORS: {
    NIGHT_BG: "#1e293b",
    NIGHT_STROKE: "#0f172a",
    DAY_FILL: "#3b82f6",
    SUN_FILL: "#fbbf24",
    MOON_FILL: "#94a3b8",
    TIDE_WATER: "#60a5fa",
    TIDE_STROKE: "#2563eb",
    TEXT_HIGH: "text-blue-600",
    TEXT_LOW: "text-slate-500",
  },
  DIMENSIONS: {
    EARTH_RADIUS_MACRO: 60,
    EARTH_RADIUS_MICRO: 12,
    MOON_ORBIT_MICRO: 60,
  }
};

// 2. Memoized Sub-components
// Using 'memo' prevents re-renders if props don't change
const MacroOrbitView = memo(({ positions }) => {
  const { earth, moon } = positions;

  return (
    <div className="bg-slate-900 rounded-2xl shadow-xl overflow-hidden flex flex-col h-full">
      <div className="bg-slate-800 p-3 border-b border-slate-700 flex items-center text-slate-300 text-sm font-medium">
        <Globe className="w-4 h-4 mr-2" /> Macro View: Solar System
      </div>
      
      <div className="relative w-full flex-1 min-h-[300px] flex items-center justify-center p-4">
        <svg 
          viewBox="-300 -300 600 600" 
          className="w-full h-full" 
          preserveAspectRatio="xMidYMid meet"
          role="img" 
          aria-label="Top-down view of Earth orbiting the Sun"
        >
          {/* Sun */}
          <circle cx="0" cy="0" r="20" fill={CONFIG.COLORS.SUN_FILL} className="drop-shadow-lg" />
          
          {/* Earth Orbit Path */}
          <circle cx="0" cy="0" r="200" fill="none" stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />
          
          {/* Radius Line (Sun to Earth) */}
          <line x1="0" y1="0" x2={earth.x} y2={earth.y} stroke="#475569" strokeWidth="1" opacity="0.5" />
          
          {/* Earth Group */}
          <g transform={`translate(${earth.x}, ${earth.y})`}>
            <circle r={CONFIG.DIMENSIONS.EARTH_RADIUS_MACRO} fill="none" stroke="#475569" strokeWidth="1" />
            <circle r={CONFIG.DIMENSIONS.EARTH_RADIUS_MICRO} fill={CONFIG.COLORS.DAY_FILL} />
          </g>
          
          {/* Moon (Absolute Position) */}
          <circle cx={moon.x} cy={moon.y} r="6" fill={CONFIG.COLORS.MOON_FILL} />
        </svg>
      </div>
    </div>
  );
});

const MicroTideView = memo(({ tides, angles, userRotation, localTideStatus }) => {
  // Helper to ensure text doesn't display upside down when rotating
  const isSunLabelFlipped = Math.abs(angles.sunDegrees) > 90;
  
  // Coordinate helpers
  const moonX = CONFIG.DIMENSIONS.MOON_ORBIT_MICRO * Math.cos(angles.toMoon); // Expects Radians
  const moonY = CONFIG.DIMENSIONS.MOON_ORBIT_MICRO * Math.sin(angles.toMoon); // Expects Radians

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 flex flex-col h-full">
      <div className="bg-slate-50 p-3 border-b border-slate-200 flex items-center text-slate-600 text-sm font-medium">
        <ZoomIn className="w-4 h-4 mr-2" /> Micro View: Earth & Tides
      </div>

      <div className="relative w-full flex-1 min-h-[300px] flex items-center justify-center bg-blue-50 p-4">
        
        {/* HUD / Heads Up Display */}
        <div className="absolute top-4 right-4 text-right z-10 pointer-events-none">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Global Potential</div>
          <div className={`text-xl font-black ${tides.alignment > 0 ? 'text-indigo-600' : 'text-orange-500'} mb-2`}>
            {tides.type.split(" ")[0].toUpperCase()}
          </div>
          <div className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Local Water</div>
          <div className={`text-xl font-black ${localTideStatus === 'High Tide' ? CONFIG.COLORS.TEXT_HIGH : CONFIG.COLORS.TEXT_LOW}`}>
            {localTideStatus === 'High Tide' ? 'HIGH' : 'LOW'}
          </div>
        </div>
        
        <svg 
          viewBox="-100 -100 200 200" 
          className="w-full h-full overflow-visible" 
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Diagram of Earth's tides relative to Moon and Sun"
        >
          {/* Background Crosshairs */}
          <g stroke="#cbd5e1" strokeWidth="1">
            <line x1="-100" y1="0" x2="100" y2="0" />
            <line x1="0" y1="-100" x2="0" y2="100" />
          </g>
          
          {/* Sun Direction Indicator */}
          <g transform={`rotate(${angles.sunDegrees})`}>
            <line x1="0" y1="0" x2="90" y2="0" stroke={CONFIG.COLORS.SUN_FILL} strokeWidth="2" strokeDasharray="4 2" />
            <text 
              x={95} y={4} 
              textAnchor="start" 
              fill="#b45309" 
              fontSize="10" 
              fontWeight="bold" 
              transform={isSunLabelFlipped ? "rotate(180, 95, 0)" : ""}
            >
              TO SUN
            </text>
            <polygon points="85,-3 90,0 85,3" fill={CONFIG.COLORS.SUN_FILL} />
          </g>
          
          {/* Tidal Ellipse (The Water Bulge) */}
          {/* Rotate expects Degrees */}
          <ellipse 
            cx="0" cy="0" 
            rx={tides.rx} ry={tides.ry} 
            fill={CONFIG.COLORS.TIDE_WATER} 
            opacity="0.4" 
            stroke={CONFIG.COLORS.TIDE_STROKE} 
            strokeWidth="1" 
            transform={`rotate(${angles.moonDegrees})`}
          />
          
          {/* Earth Base (Night side) */}
          <circle r="12" fill={CONFIG.COLORS.NIGHT_BG} stroke={CONFIG.COLORS.NIGHT_STROKE} strokeWidth="1" />
          
          {/* Day Side Hemi-circle */}
          <g transform={`rotate(${angles.sunDegrees})`}>
            <path d="M 0,-12 A 12,12 0 0,1 0,12 Z" fill={CONFIG.COLORS.DAY_FILL} />
          </g>
          
          {/* User Location Marker */}
          <g transform={`rotate(${angles.sunDegrees + userRotation})`}>
            <circle cx="12" cy="0" r="3" fill={CONFIG.COLORS.SUN_FILL} stroke="white" strokeWidth="1" className="drop-shadow-sm" />
          </g>
          
          {/* Moon Orbit Path */}
          <circle cx="0" cy="0" r={CONFIG.DIMENSIONS.MOON_ORBIT_MICRO} fill="none" stroke="#94a3b8" strokeDasharray="2 2" />
          
          {/* Moon Object */}
          <g transform={`translate(${moonX}, ${moonY})`}>
            <circle r="6" fill="#334155" />
            {/* Moon Phase Shadow (Simplified) */}
            <g transform={`rotate(${angles.sunDegrees})`}>
              <path d="M 0,-6 A 6,6 0 0,1 0,6 Z" fill="#f1f5f9" />
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
});

// 3. Main Export
export default function TideDashboard({ orbitalData }) {
  // Destructure here for cleaner passing to children
  const { positions, tides, angles, userRotation, localTideStatus } = orbitalData;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full h-auto lg:h-[400px]">
      <MacroOrbitView positions={positions} />
      <MicroTideView 
        tides={tides} 
        angles={angles} 
        userRotation={userRotation} 
        localTideStatus={localTideStatus} 
      />
    </div>
  );
}