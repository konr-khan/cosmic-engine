import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Settings, MousePointer2, Calendar, Clock, Globe, Target, Sun, RotateCw, MapPin, Check } from 'lucide-react';

// UTILS
import { toRadians, toDegrees, formatTime } from '../../utils/astronomy';
import { CONFIG } from '../../utils/config';

// ==========================================
// 1. LEGACY EXPORTS (Compatibility Mode)
// ==========================================
// These are preserved to ensure GlobalCommandBar does not crash.

export const BufferedInput = ({ value, onChange, type = "text", className, ...props }) => {
  const [localValue, setLocalValue] = useState(value);
  const [active, setActive] = useState(false);
  useEffect(() => { if (!active) setLocalValue(value); }, [value, active]);
  return (
    <input 
      {...props} type={type} className={className} value={localValue}
      onChange={(e) => setLocalValue(e.target.value)} 
      onFocus={() => setActive(true)}
      onBlur={() => { setActive(false); onChange(localValue); }} 
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
    />
  );
};

export const CoordinateDial = ({ value, min, max, onChange, label, orientation = 'horizontal', color = "#6366f1", wrapAround = false, tickSpacing = 10 }) => {
  // Legacy stub - minimal implementation to prevent crash if rendered
  return <div className="p-2 border border-red-500 text-red-500 text-xs">Legacy Dial (Deprecated)</div>;
};

export const PolarLongitudeSelector = () => null; // Deprecated stub
export const LatitudeSlider = () => null; // Deprecated stub

// ==========================================
// 2. MODERN COMPONENT HELPERS
// ==========================================

const UI_COLORS = {
  bg: CONFIG.THEME.BG || "#0f172a",      
  ringBg: CONFIG.THEME.RING_BG || "#1e293b", 
  accent: CONFIG.THEME.ACCENT || "#6366f1",
  text: CONFIG.THEME.TEXT_MUTED || "#94a3b8",
  dateRing: "#10b981",    
  lonRing: "#f59e0b",     
  timeRing: "#3b82f6",    
  highlight: "#fcd34d"    
};

const getDayOfYear = (date) => {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
};

const getDateFromDayOfYear = (year, day) => {
  const date = new Date(year, 0);
  date.setDate(day); 
  return date;
};

// ==========================================
// 3. SUB-COMPONENTS
// ==========================================

const LivingMarble = ({ date, timeUTC, userLon, lat = 47, radius = 45 }) => {
  const dayOfYear = getDayOfYear(date);
  // Simple declination approximation for the visual
  const declination = 23.44 * Math.sin(toRadians((360 / 365) * (dayOfYear - 81)));
  
  // Calculate sun angle relative to user
  const sunLon = (12 - timeUTC) * 15;
  const relSunAngle = sunLon - userLon;
  let phaseAngle = relSunAngle % 360;
  if (phaseAngle < 0) phaseAngle += 360;

  const gridLines = [];
  for (let l = -180; l < 360; l += 30) {
    const rad = toRadians(l - userLon);
    const x = radius * Math.sin(rad);
    // Only draw front-facing lines
    if (Math.cos(rad) > 0) {
      gridLines.push(<ellipse key={l} cx="0" cy="0" rx={Math.abs(x)} ry={radius} fill="none" stroke={UI_COLORS.accent} strokeWidth="0.5" opacity="0.3" />);
    }
  }

  // Terminator Math
  const theta = toRadians(phaseAngle); 
  const r = radius;
  const px = -r * Math.cos(theta);
  const isRightLit = phaseAngle > 0 && phaseAngle < 180;
  const isFront = phaseAngle < 90 || phaseAngle > 270;

  let lightPath = `M 0 -${r} A ${Math.abs(px)} ${r} 0 0 ${isFront === isRightLit ? 1 : 0} 0 ${r} A ${r} ${r} 0 0 ${isRightLit ? 1 : 0} 0 -${r}`;

  const latRad = toRadians(lat);
  const latY = -radius * Math.sin(latRad);
  const latHalfW = radius * Math.cos(latRad);

  return (
    <g>
      <defs>
        <clipPath id="earthClip"><circle r={radius} /></clipPath>
        <radialGradient id="atmosGradient"><stop offset="80%" stopColor="#000" stopOpacity="0" /><stop offset="100%" stopColor={UI_COLORS.accent} stopOpacity="0.5" /></radialGradient>
      </defs>
      
      {/* Base Globe */}
      <circle r={radius} fill={UI_COLORS.bg} stroke={UI_COLORS.ringBg} strokeWidth="1" />
      
      {/* Grid & Location */}
      <g clipPath="url(#earthClip)">
         {gridLines}
         <line x1={-radius} y1="0" x2={radius} y2="0" stroke={UI_COLORS.accent} strokeWidth="1" opacity="0.5" />
         {/* Prime Meridian */}
         <line x1="0" y1={-radius} x2="0" y2={radius} stroke={UI_COLORS.highlight} strokeWidth="1.5" strokeOpacity="0.8" />
         {/* User Latitude */}
         <line x1={-latHalfW} y1={latY} x2={latHalfW} y2={latY} stroke={UI_COLORS.highlight} strokeWidth="4" strokeOpacity="0.5" strokeLinecap="round" />
      </g>

      {/* Sunlight/Shadow */}
      <g transform={`rotate(${-declination})`} clipPath="url(#earthClip)">
         <path d={lightPath} fill={UI_COLORS.timeRing} fillOpacity="0.2" stroke="none" />
         <path d={lightPath} fill="none" stroke="#60a5fa" strokeWidth="1" strokeOpacity="0.5" />
      </g>
      
      {/* Atmosphere */}
      <circle r={radius} fill="url(#atmosGradient)" style={{ mixBlendMode: 'screen' }} opacity="0.3" pointerEvents="none" />
    </g>
  );
};

const ControlRing = ({ radius, width, value, max, color, formatValue, rangeOffset = 0 }) => {
  let normalized = value - rangeOffset;
  let angle = (normalized / max) * 360;
  
  // Standardize angle to 0-360
  angle = angle % 360;
  if (angle < 0) angle += 360;

  // VISUAL FIX: Clamp to 359.99 to prevent arc collapse on full circles
  const visualAngle = angle >= 360 || angle <= 0.01 ? 0.01 : angle;
  const drawAngle = visualAngle > 359.9 ? 359.9 : visualAngle;

  const rads = toRadians(drawAngle - 90); // -90 puts 0 at the top
  const ix = Math.cos(rads) * radius;
  const iy = Math.sin(rads) * radius;

  // SVG Arc Flags
  const largeArc = drawAngle > 180 ? 1 : 0;
  const sweep = 1; // Clockwise

  return (
    <g className="select-none group">
      {/* Track */}
      <circle cx="0" cy="0" r={radius} fill="none" stroke={UI_COLORS.ringBg} strokeWidth={width} />
      
      {/* Trail */}
      <path 
        d={`M 0 -${radius} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${ix} ${iy}`} 
        fill="none" 
        stroke={color} 
        strokeWidth={2} 
        opacity="0.3" 
      />
      
      {/* Ticks */}
      {[0, 90, 180, 270].map(d => {
         const tickRad = toRadians(d - 90);
         const tx = Math.cos(tickRad) * (radius - width/2 + 5);
         const ty = Math.sin(tickRad) * (radius - width/2 + 5);
         return <circle key={d} cx={tx} cy={ty} r={2} fill={UI_COLORS.text} opacity="0.3" />
      })}

      {/* Handle */}
      <g transform={`translate(${ix}, ${iy})`}>
        <circle r={width / 1.8} fill={UI_COLORS.bg} stroke={color} strokeWidth={2} className="drop-shadow-lg" />
        <circle r={4} fill={color} />
        <text y={35} textAnchor="middle" className="text-[10px] font-mono font-bold fill-white pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-black rounded p-1" style={{ textShadow: '0px 2px 4px rgba(0,0,0,0.8)' }}>
           {formatValue(value)}
        </text>
      </g>
    </g>
  );
};

const CosmicLatitudeSlider = ({ value, onChange }) => {
    const trackRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);

    const updateValue = (e) => {
        if (!trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        const y = e.clientY - rect.top;
        let pct = y / rect.height;
        if (pct < 0) pct = 0;
        if (pct > 1) pct = 1;
        // Map 0..1 (top..bottom) to 90..-90
        onChange(Math.round(90 - (pct * 180)));
    };

    const handlePointerDown = (e) => { 
        setIsDragging(true); 
        updateValue(e); 
        e.currentTarget.setPointerCapture(e.pointerId); 
    };
    
    const handlePointerMove = (e) => { if (isDragging) updateValue(e); };
    const handlePointerUp = (e) => { 
        setIsDragging(false); 
        e.currentTarget.releasePointerCapture(e.pointerId); 
    };

    // Calculate thumb position percentage for CSS
    const thumbPct = ((90 - value) / 180) * 100;

    return (
        <div className="flex flex-col items-center h-full w-10 sm:w-12 gap-2 py-2">
            <span className="text-[9px] font-bold text-slate-500 tracking-wider">LAT</span>
            <div 
                ref={trackRef} 
                className="relative flex-1 w-6 sm:w-8 bg-slate-800 rounded-full cursor-ns-resize touch-none border border-slate-700 overflow-hidden" 
                onPointerDown={handlePointerDown} 
                onPointerMove={handlePointerMove} 
                onPointerUp={handlePointerUp}
            >
                {/* Center Equator Line */}
                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-slate-600"></div>
                
                {/* Thumb */}
                <div 
                    className="absolute left-1/2 w-6 h-6 rounded-full bg-slate-900 border-2 shadow-lg flex items-center justify-center pointer-events-none transition-transform duration-75" 
                    style={{ 
                        top: `${thumbPct}%`, 
                        transform: 'translate(-50%, -50%)',
                        borderColor: UI_COLORS.highlight 
                    }}
                >
                    <div className="w-1.5 h-1.5 rounded-full bg-[#fcd34d]"></div>
                </div>
                
                {/* Ticks */}
                <div className="absolute right-0 top-0 h-full w-2 flex flex-col justify-between py-4 opacity-30 pointer-events-none px-1">
                    <div className="w-full h-[1px] bg-slate-400"></div>
                    <div className="w-full h-[1px] bg-slate-400"></div>
                    <div className="w-full h-[1px] bg-slate-400"></div>
                    <div className="w-full h-[1px] bg-slate-400"></div>
                    <div className="w-full h-[1px] bg-slate-400"></div>
                </div>
            </div>
            <span className="text-[10px] font-mono text-amber-400">{value}°</span>
        </div>
    );
};

const DashboardItem = ({ label, value, color, icon: Icon, action }) => (
    <div className="flex flex-col justify-between bg-slate-800 p-2 sm:p-3 rounded-xl border border-slate-700 w-full h-full relative group">
        <div className="flex items-center gap-2 mb-1">
             {Icon && <Icon className="w-3 h-3 text-slate-500" />}
             <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 tracking-wider truncate">{label}</span>
        </div>
        <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-mono font-bold truncate" style={{ color }}>{value}</span>
            {action && (
                <button onClick={action.onClick} className="opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-600 hover:bg-indigo-500 text-white p-1 rounded text-[9px] font-bold flex items-center gap-1">
                    <Target className="w-3 h-3" /> {action.label}
                </button>
            )}
        </div>
    </div>
);

// ==========================================
// 4. MAIN COMPONENT (CosmicChronometer)
// ==========================================

const CosmicChronometer = ({ 
    date, 
    time, 
    latitude, 
    longitude, // -180 to 180
    onDateChange, 
    onTimeChange, 
    onLatChange, 
    onLonChange,
    widgets = {},
    toggleWidget,
    className = ""
}) => {
  const svgRef = useRef(null);
  const [activeRing, setActiveRing] = useState(null); 
  const dragCenterRef = useRef({ x: 0, y: 0 }); // Cache center to avoid layout shift glitches
  const lastTimeRef = useRef(time);
  const lastDayRef = useRef(getDayOfYear(date));

  // --- Interaction Logic ---
  const handlePointerDown = (e) => {
    e.preventDefault(); 
    if (!svgRef.current) return;
    
    // Cache the center point of the SVG relative to the viewport
    const rect = svgRef.current.getBoundingClientRect();
    dragCenterRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };

    lastTimeRef.current = time;
    lastDayRef.current = getDayOfYear(date);

    const dx = e.clientX - dragCenterRef.current.x;
    const dy = e.clientY - dragCenterRef.current.y;
    const dist = Math.sqrt(dx*dx + dy*dy); // Distance from center in visual pixels

    // Since we are using viewBox -160 to 160, the visual pixels might scale.
    // We need to normalize distance based on the actual rendered size.
    // The rendered radius is rect.width / 2. The viewBox radius is 160.
    const scaleFactor = 160 / (rect.width / 2);
    const normalizedDist = dist * scaleFactor;

    if (normalizedDist > 115 && normalizedDist < 155) setActiveRing('date');
    else if (normalizedDist > 85 && normalizedDist < 115) setActiveRing('time');
    else if (normalizedDist > 55 && normalizedDist < 85) setActiveRing('lon');
  };

  const handlePointerMove = useCallback((e) => {
    if (!activeRing || !svgRef.current) return;
    e.preventDefault();

    // Calculate angle based on cached center
    const dx = e.clientX - dragCenterRef.current.x;
    const dy = e.clientY - dragCenterRef.current.y;
    let angle = toDegrees(Math.atan2(dy, dx)) + 90; 
    if (angle < 0) angle += 360;

    if (activeRing === 'date') {
        const currentYear = date.getFullYear();
        const newDay = Math.round((angle / 360) * 365);
        const prevDay = lastDayRef.current;
        const diff = newDay - prevDay;
        
        // Year wraparound logic
        let targetYear = currentYear;
        if (diff < -300) targetYear += 1; 
        else if (diff > 300) targetYear -= 1;
        
        const newDate = getDateFromDayOfYear(targetYear, newDay);
        lastDayRef.current = newDay;
        onDateChange(newDate);
    } 
    else if (activeRing === 'lon') {
        // Map 0-360 angle to -180 to 180 longitude
        // Visual 0 (Top) -> 0 deg Lon
        // Visual 90 (Right) -> 90 deg Lon (East)
        // Visual 270 (Left) -> -90 deg Lon (West)
        let newLon = angle;
        if (newLon > 180) newLon -= 360; 
        onLonChange(Math.round(newLon));
    } 
    else if (activeRing === 'time') {
        let t = (angle / 360) * 24;
        const prevT = lastTimeRef.current;
        const diff = t - prevT;
        
        // Midnight crossing logic
        if (diff < -12) {
             const nextDay = new Date(date);
             nextDay.setDate(date.getDate() + 1); 
             onDateChange(nextDay);
        } else if (diff > 12) {
             const prevDay = new Date(date);
             prevDay.setDate(date.getDate() - 1); 
             onDateChange(prevDay);
        }
        lastTimeRef.current = t;
        onTimeChange(t);
    }
  }, [activeRing, date, time, onDateChange, onTimeChange, onLonChange]);

  const handlePointerUp = () => setActiveRing(null);

  useEffect(() => {
    if (activeRing) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [activeRing, handlePointerMove]);

  // --- Formatters ---
  const formatDateRing = (d) => { const tempDate = getDateFromDayOfYear(date.getFullYear(), d); return tempDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
  const formatLonRing = (l) => `${Math.abs(l)}°${l >= 0 ? 'E' : 'W'}`;
  const formatTimeRing = (t) => formatTime(t);

  // --- Sync Action ---
  const handleSyncNow = () => {
      const n = new Date();
      onDateChange(n);
      onTimeChange(n.getUTCHours() + n.getUTCMinutes() / 60);
  };

  // --- Visual value mappers ---
  // Ensure the Longitude Ring draws correctly (0 at top, filling clockwise for East, etc)
  // We normalize -180..180 to 0..360 for the ring component
  let lonVisual = longitude;
  if (lonVisual < 0) lonVisual += 360;

  return (
    <div className={`bg-slate-900 rounded-3xl p-4 sm:p-6 shadow-2xl relative border border-slate-800 flex flex-col items-center select-none ${className}`}>
        {/* Header */}
        <div className="text-slate-400 text-[10px] sm:text-xs font-bold tracking-[0.2em] mb-4 uppercase flex items-center gap-2 w-full justify-center">
            <Settings className="w-3 h-3" /> Orbital Chronometer
        </div>

        {/* Main Control Area (Responsive Flex) */}
        <div className="flex flex-row items-stretch justify-center gap-2 sm:gap-6 w-full flex-1 min-h-0">
            {/* Latitude Slider (Scales Height) */}
            <CosmicLatitudeSlider value={latitude} onChange={onLatChange} />

            {/* Central Dial System (Responsive Aspect Ratio) */}
            <div className="relative touch-none cursor-crosshair flex-1 aspect-square max-w-[320px] max-h-[320px]">
              <svg 
                ref={svgRef} 
                viewBox="-160 -160 320 320" 
                preserveAspectRatio="xMidYMid meet"
                className="w-full h-full drop-shadow-2xl"
                onPointerDown={handlePointerDown} 
              >
                {/* 1. Date Ring (Outer) */}
                <ControlRing radius={135} width={25} value={getDayOfYear(date)} max={365} color={UI_COLORS.dateRing} formatValue={formatDateRing} />
                <g className="pointer-events-none opacity-40">
                    <text x="0" y="-118" textAnchor="middle" className="text-[8px] fill-slate-500 font-mono">DEC SOL</text>
                    <text x="0" y="125" textAnchor="middle" className="text-[8px] fill-slate-500 font-mono">JUN SOL</text>
                </g>

                {/* 2. Time Ring (Middle) */}
                <ControlRing radius={100} width={25} value={time} max={24} rangeOffset={0} color={UI_COLORS.timeRing} formatValue={formatTimeRing} />
                <g className="pointer-events-none opacity-40">
                    <text x="0" y="-82" textAnchor="middle" className="text-[8px] fill-slate-500 font-mono">00:00</text>
                    <text x="0" y="90" textAnchor="middle" className="text-[8px] fill-slate-500 font-mono">12:00</text>
                </g>

                {/* 3. Longitude Ring (Inner) - Mapped 0-360 */}
                <ControlRing radius={65} width={25} value={lonVisual} max={360} rangeOffset={0} color={UI_COLORS.lonRing} formatValue={formatLonRing} />

                {/* 4. Living Marble (Center) */}
                <LivingMarble date={date} timeUTC={time} userLon={longitude} lat={latitude} radius={45} />
                
                {/* Visual Cue */}
                <g transform="translate(130, 130)" className="opacity-30 pointer-events-none">
                    <MousePointer2 className="w-6 h-6 text-white" />
                </g>
              </svg>
            </div>
        </div>

        {/* Dashboard Readouts */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full mt-4 sm:mt-6 border-b border-slate-800 pb-4">
            <DashboardItem 
                label="DATE" 
                icon={Calendar}
                value={date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric'})} 
                color={UI_COLORS.dateRing} 
            />
            <DashboardItem 
                label="UTC TIME" 
                icon={Clock}
                value={formatTimeRing(time)} 
                color={UI_COLORS.timeRing} 
                action={{ label: "SYNC", onClick: handleSyncNow }}
            />
            <DashboardItem 
                label="COORDINATES" 
                icon={Globe}
                value={`${Math.abs(latitude)}°${latitude >= 0 ? 'N' : 'S'}, ${formatLonRing(longitude)}`} 
                color={UI_COLORS.lonRing} 
            />
        </div>

        {/* Widget Toggles */}
        {toggleWidget && (
            <div className="flex gap-2 sm:gap-4 mt-4 flex-wrap justify-center">
                 {[
                    { key: 'daylight', label: 'Daylight', icon: Sun },
                    { key: 'tides', label: 'Tides', icon: RotateCw },
                    { key: 'map', label: 'Map', icon: MapPin }
                 ].map(opt => (
                    <button 
                        key={opt.key} 
                        onClick={() => toggleWidget(opt.key)} 
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            widgets[opt.key] 
                            ? 'bg-slate-800 border-indigo-500 text-indigo-400' 
                            : 'bg-transparent border-slate-800 text-slate-600 hover:text-slate-400'
                        }`}
                    >
                        <opt.icon className="w-3 h-3" />
                        {opt.label}
                        {widgets[opt.key] && <Check className="w-3 h-3" />}
                    </button>
                 ))}
            </div>
        )}
    </div>
  );
};

export default CosmicChronometer;