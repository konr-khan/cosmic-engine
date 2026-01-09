import React, { useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { toDegrees, toRadians } from '../utils/astronomy';

const THEME = {
  GRID_STROKE: "#94a3b8",
  ACCENT: "#6366f1",
  SUN_FILL: "#fbbf24",
  SHADOW_FILL: "#0f172a",
};

// Helper: Flips latitude to SVG Y coordinate (0 = North/Top)
const getY = (lat) => 90 - lat;

const TerminatorMap = ({ solarData, latitude, longitude, timeOfDay }) => {
  // Defensive loading state
  if (!solarData) return <div className="h-full bg-slate-100 rounded-2xl animate-pulse" />;

  const { declination } = solarData;

  // 1. Calculate Sun's position
  const sunLong = (12 - timeOfDay) * 15;
  const normalizedSunLong = ((sunLong + 180) % 360 + 360) % 360 - 180;

  // 2. Helper to map Longitude to SVG X coordinate (0-360)
  // This ensures the map is always centered on the User's Longitude
  const getX = (targetLon) => {
    const offset = targetLon - longitude;
    return ((offset + 540) % 360); 
  };

  // 3. Generate the Night Shadow Path
  const shadowPath = useMemo(() => {
    // Prevent Infinity in calculation if declination is exactly 0
    const safeDeclination = Math.abs(declination) < 0.1 
      ? (declination >= 0 ? 0.1 : -0.1) 
      : declination;

    const points = [];
    for (let x = 0; x <= 360; x += 2) {
      const currentLon = longitude - 180 + x;
      const H = toRadians(currentLon - normalizedSunLong);
      const latRad = Math.atan(-Math.cos(H) / Math.tan(toRadians(safeDeclination)));
      
      // Safety check: if calculation returns NaN, default to 0
      const latDeg = isNaN(latRad) ? 0 : toDegrees(latRad);
      points.push(`${x},${getY(latDeg)}`);
    }

    // Close the polygon based on which pole is currently in 24h darkness
    const closingPath = declination > 0 
      ? "L 360,180 L 0,180 Z" 
      : "L 360,0 L 0,0 Z";

    return `M ${points.join(" L ")} ${closingPath}`;
  }, [declination, normalizedSunLong, longitude]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-end mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Solar Terminator
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Centered on Local Meridian ({longitude.toFixed(1)}°)
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold text-slate-500">DECLINATION</div>
          <div className="font-mono text-indigo-600 font-bold">
            {declination.toFixed(1)}°
          </div>
        </div>
      </div>

      {/* Map Visualization */}
      <div className="relative w-full flex-1 min-h-[300px] bg-blue-50 rounded-lg overflow-hidden border border-slate-200">
        <svg 
          viewBox="0 0 360 180" 
          className="w-full h-full block" 
          preserveAspectRatio="xMidYMid meet" 
        >
          {/* Vertical Longitude Grid */}
          {[-180, -90, 0, 90, 180, 270].map(l => (
            <line 
              key={l} 
              x1={getX(l)} y1="0" 
              x2={getX(l)} y2="180" 
              stroke={THEME.GRID_STROKE} 
              strokeWidth="0.5" 
              strokeOpacity="0.3" 
            />
          ))}

          {/* Horizontal Latitude Grid */}
          <line x1="0" y1={getY(66.5)} x2="360" y2={getY(66.5)} stroke="#cbd5e1" strokeDasharray="2 2" strokeWidth="0.5" />
          <line x1="0" y1={getY(-66.5)} x2="360" y2={getY(-66.5)} stroke="#cbd5e1" strokeDasharray="2 2" strokeWidth="0.5" />
          <line x1="0" y1={getY(0)} x2="360" y2={getY(0)} stroke={THEME.GRID_STROKE} strokeWidth="0.5" opacity="0.5" />

          {/* User Latitude Line (Horizontal) */}
          <line 
            x1="0" y1={getY(latitude)} 
            x2="360" y2={getY(latitude)} 
            stroke={THEME.ACCENT} 
            strokeWidth="0.5" 
            strokeDasharray="4 2" 
          />
          
          {/* Center Meridian Line (Vertical) */}
          <line 
            x1={180} y1="0" 
            x2={180} y2="180" 
            stroke={THEME.ACCENT} 
            strokeWidth="0.5" 
            strokeDasharray="4 2" 
          />

          {/* Night Shadow */}
          <path d={shadowPath} fill={THEME.SHADOW_FILL} fillOpacity="0.3" />

          {/* Sun Marker */}
          <g transform={`translate(${getX(normalizedSunLong)}, ${getY(declination)})`}>
            <circle r="4" fill={THEME.SUN_FILL} stroke="white" strokeWidth="1" />
            <line x1="0" y1="-180" x2="0" y2="180" stroke={THEME.SUN_FILL} strokeWidth="0.5" opacity="0.5" strokeDasharray="2 2" />
          </g>

          {/* User Location Marker (Always centered at 180, latitude) */}
          <g transform={`translate(180, ${getY(latitude)})`}>
            <circle r="3" fill={THEME.ACCENT} stroke="white" strokeWidth="1" />
            <text x="6" y="2" className="text-[6px] fill-indigo-600 font-bold opacity-100">YOU</text>
          </g>
        </svg>
      </div>
    </div>
  );
};

export default TerminatorMap;