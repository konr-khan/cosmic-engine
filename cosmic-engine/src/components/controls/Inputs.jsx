import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Settings, MousePointer2, Sun, RotateCw, MapPin, 
  Check, Target, Calendar, Clock, Globe, Keyboard, X, Crosshair
} from 'lucide-react';
import { toRadians, toDegrees, formatTime, getDayOfYear, getDateFromDayOfYear } from '../../utils/astronomy';
import { CONFIG } from '../../utils/config';

// ==========================================
// 1. CONFIGURATION & HELPERS
// ==========================================

const RINGS = {
  DATE: { r: 135, w: 25, color: "#10b981" }, // Green
  TIME: { r: 100, w: 25, color: "#3b82f6" }, // Blue
  LON:  { r: 65,  w: 25, color: "#f59e0b" }  // Amber
};

const UI_COLORS = {
  bg: CONFIG.THEME?.BG || "#0f172a",       
  ringBg: CONFIG.THEME?.RING_BG || "#1e293b", 
  accent: CONFIG.THEME?.ACCENT || "#6366f1",
  text: CONFIG.THEME?.TEXT_MUTED || "#94a3b8",
  highlight: "#fcd34d",
  dateRing: RINGS.DATE.color,     
  timeRing: RINGS.TIME.color,     
  lonRing:  RINGS.LON.color,      
};

const getControlAngle = (clientX, clientY, rect) => {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = clientX - cx;
  const dy = clientY - cy;
  let angle = toDegrees(Math.atan2(dy, dx)) + 90; 
  if (angle < 0) angle += 360;
  return angle;
};


// ==========================================
// 2. VISUAL SUB-COMPONENTS
// ==========================================

// --- PRECISE INPUT FORM ---
const PreciseInputPanel = ({ date, time, lat, lon, onDateChange, onTimeChange, onLatChange, onLonChange, onClose }) => {
    // Local state for form handling before commit
    const [localDate, setLocalDate] = useState(date.toISOString().split('T')[0]);
    const [localTime, setLocalTime] = useState(formatTime(time));
    const [localLat, setLocalLat] = useState(lat);
    const [localLon, setLocalLon] = useState(lon);

    const handleSave = () => {
        // Parse and commit
        const [y, m, d] = localDate.split('-').map(Number);
        onDateChange(new Date(y, m - 1, d));
        
        const [h, min] = localTime.split(':').map(Number);
        onTimeChange(h + min / 60);

        onLatChange(Math.max(-90, Math.min(90, Number(localLat))));
        onLonChange(Math.max(-180, Math.min(180, Number(localLon))));
        onClose();
    };

    return (
        <div className="absolute inset-0 z-20 bg-slate-900/95 backdrop-blur-sm p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">Precise Input</span>
                <button onClick={onClose}><X className="w-4 h-4 text-slate-400 hover:text-white" /></button>
            </div>
            
            <div className="space-y-3">
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase text-slate-500 font-bold">Date</label>
                    <input type="date" value={localDate} onChange={e => setLocalDate(e.target.value)} className="bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white focus:border-indigo-500 outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase text-slate-500 font-bold">Time (UTC)</label>
                    <input type="time" value={localTime} onChange={e => setLocalTime(e.target.value)} className="bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white focus:border-indigo-500 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase text-slate-500 font-bold">Latitude</label>
                        <input type="number" min="-90" max="90" step="0.1" value={localLat} onChange={e => setLocalLat(e.target.value)} className="bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white focus:border-indigo-500 outline-none" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase text-slate-500 font-bold">Longitude</label>
                        <input type="number" min="-180" max="180" step="0.1" value={localLon} onChange={e => setLocalLon(e.target.value)} className="bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white focus:border-indigo-500 outline-none" />
                    </div>
                </div>
            </div>

            <button onClick={handleSave} className="mt-auto bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2">
                <Check className="w-4 h-4" /> Apply Coordinates
            </button>
        </div>
    );
};

// --- LATITUDE SLIDER WITH TICKS ---
const CosmicLatitudeSlider = ({ value, onChange }) => {
    const trackRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);

    const handlePointerDown = (e) => { setIsDragging(true); updateValue(e); e.currentTarget.setPointerCapture(e.pointerId); };
    const handlePointerMove = (e) => { if (isDragging) updateValue(e); };
    const handlePointerUp = (e) => { setIsDragging(false); e.currentTarget.releasePointerCapture(e.pointerId); };
    
    const updateValue = (e) => {
        if (!trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        const y = e.clientY - rect.top;
        let pct = y / rect.height;
        if (pct < 0) pct = 0; if (pct > 1) pct = 1;
        onChange(Math.round(90 - (pct * 180)));
    };

    const thumbPct = ((90 - value) / 180) * 100;

    // Presets for the "Tics"
    const presets = [
        { lat: 90, label: "N" },
        { lat: 66.5, label: "C" }, // Arctic Circle
        { lat: 23.4, label: "T" }, // Tropic Cancer
        { lat: 0, label: "EQ" },
        { lat: -23.4, label: "T" }, // Tropic Capricorn
        { lat: -66.5, label: "C" }, // Antarctic Circle
        { lat: -90, label: "S" },
    ];

    return (
        <div className="flex flex-col items-center h-full gap-2 min-h-[150px] relative group">
            <span className="text-[9px] font-bold text-slate-500 tracking-wider">LAT</span>
            <div ref={trackRef} className="relative w-8 bg-slate-800 rounded-full cursor-ns-resize touch-none border border-slate-700 flex-grow" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
                
                {/* Visual Track Line */}
                <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-slate-700 transform -translate-x-1/2"></div>
                
                {/* Snap Ticks */}
                {presets.map(p => {
                    const top = ((90 - p.lat) / 180) * 100;
                    return (
                        <div 
                            key={p.lat}
                            className="absolute left-0 w-full flex items-center justify-center group/tick cursor-pointer"
                            style={{ top: `${top}%`, height: '10px', marginTop: '-5px' }}
                            onPointerDown={(e) => { e.stopPropagation(); onChange(p.lat); }}
                        >
                            <div className="w-3 h-[1px] bg-slate-500 group-hover/tick:bg-white group-hover/tick:w-4 transition-all"></div>
                            {/* Hover Label */}
                            <div className="absolute left-8 opacity-0 group-hover/tick:opacity-100 bg-slate-900 text-[9px] text-white px-1 rounded border border-slate-700 whitespace-nowrap z-10 pointer-events-none">
                                {p.lat}° {p.label}
                            </div>
                        </div>
                    );
                })}

                {/* Thumb */}
                <div className="absolute left-1/2 w-5 h-5 rounded-full bg-slate-900 border-2 shadow-lg flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-75 z-10" style={{ top: `${thumbPct}%`, borderColor: UI_COLORS.highlight }}>
                    <div className="w-1 h-1 rounded-full bg-[#fcd34d]"></div>
                </div>
            </div>
            <span className="text-[9px] font-mono text-amber-400">{value}°</span>
        </div>
    );
};

const LivingMarble = React.memo(({ date, timeUTC, userLon, lat = 47, radius = 45 }) => {
    const dayOfYear = getDayOfYear(date);
    const declination = 23.44 * Math.sin(toRadians((360 / 365) * (dayOfYear - 81)));
    
    const sunLon = (12 - timeUTC) * 15;
    const relSunAngle = sunLon - userLon;
    let phaseAngle = relSunAngle % 360;
    if (phaseAngle < 0) phaseAngle += 360;
  
    const gridLines = useMemo(() => {
        const lines = [];
        for (let l = -180; l < 360; l += 30) {
            const rad = toRadians(l - userLon);
            const x = radius * Math.sin(rad);
            if (Math.cos(rad) > 0) {
                lines.push(<ellipse key={l} cx="0" cy="0" rx={Math.abs(x)} ry={radius} fill="none" stroke={UI_COLORS.accent} strokeWidth="0.5" opacity="0.3" />);
            }
        }
        return lines;
    }, [userLon, radius]);
  
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
        <circle r={radius} fill={UI_COLORS.bg} stroke={UI_COLORS.ringBg} strokeWidth="1" />
        <g clipPath="url(#earthClip)">
           {gridLines}
           <line x1={-radius} y1="0" x2={radius} y2="0" stroke={UI_COLORS.accent} strokeWidth="1" opacity="0.5" />
           <line x1="0" y1={-radius} x2="0" y2={radius} stroke={UI_COLORS.highlight} strokeWidth="1.5" strokeOpacity="0.8" />
           <line x1={-latHalfW} y1={latY} x2={latHalfW} y2={latY} stroke={UI_COLORS.highlight} strokeWidth="4" strokeOpacity="0.5" strokeLinecap="round" />
        </g>
        <g transform={`rotate(${-declination})`} clipPath="url(#earthClip)">
           <path d={lightPath} fill={UI_COLORS.timeRing} fillOpacity="0.2" stroke="none" />
           <path d={lightPath} fill="none" stroke="#60a5fa" strokeWidth="1" strokeOpacity="0.5" />
        </g>
        <circle r={radius} fill="url(#atmosGradient)" style={{ mixBlendMode: 'screen' }} opacity="0.3" pointerEvents="none" />
      </g>
    );
});

const ControlRing = React.memo(({ config, value, max, formatValue, rangeOffset = 0 }) => {
  const { r, w, color } = config;
  let normalized = value - rangeOffset;
  let angle = (normalized / max) * 360;
  
  angle = angle % 360;
  if (angle < 0) angle += 360;

  const visualAngle = angle >= 360 || angle <= 0.01 ? 0.01 : angle;
  const drawAngle = visualAngle > 359.9 ? 359.9 : visualAngle;

  const rads = toRadians(drawAngle - 90);
  const ix = Math.cos(rads) * r;
  const iy = Math.sin(rads) * r;

  return (
    <g className="select-none group">
      <circle cx="0" cy="0" r={r} fill="none" stroke={UI_COLORS.ringBg} strokeWidth={w} />
      <path d={`M 0 -${r} A ${r} ${r} 0 ${drawAngle > 180 ? 1 : 0} 1 ${ix} ${iy}`} fill="none" stroke={color} strokeWidth={2} opacity="0.3" />
      {[0, 90, 180, 270].map(d => {
         const tickRad = toRadians(d - 90);
         const tx = Math.cos(tickRad) * (r - w/2 + 5);
         const ty = Math.sin(tickRad) * (r - w/2 + 5);
         return <circle key={d} cx={tx} cy={ty} r={2} fill={UI_COLORS.text} opacity="0.3" />
      })}
      <g transform={`translate(${ix}, ${iy})`}>
        <circle r={w / 1.8} fill={UI_COLORS.bg} stroke={color} strokeWidth={2} className="drop-shadow-lg" />
        <circle r={4} fill={color} />
        <text y={35} textAnchor="middle" className="text-[10px] font-mono font-bold fill-white pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-black px-2 py-1 rounded" style={{ textShadow: '0px 2px 4px rgba(0,0,0,0.8)' }}>
           {formatValue(value)}
        </text>
      </g>
    </g>
  );
});

const DashboardItem = ({ label, value, color, icon: Icon, action, onEdit }) => (
    <div className="flex flex-col justify-between bg-slate-800/50 p-2 sm:p-3 rounded-xl border border-slate-700/50 w-full h-full relative group hover:border-slate-600 transition-colors">
        <div className="flex items-center gap-2 mb-1">
             {Icon && <Icon className="w-3 h-3 text-slate-500" />}
             <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 tracking-wider truncate">{label}</span>
        </div>
        <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold truncate" style={{ color }}>{value}</span>
            <div className="flex gap-1">
                {onEdit && (
                     <button onClick={onEdit} className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-700 hover:bg-slate-600 text-white p-1 rounded">
                        <Keyboard className="w-3 h-3" />
                     </button>
                )}
                {action && (
                    <button onClick={action.onClick} className="opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-600 hover:bg-indigo-500 text-white p-1 rounded text-[9px] font-bold">
                        <Target className="w-3 h-3" />
                    </button>
                )}
            </div>
        </div>
    </div>
);

// ==========================================
// 3. MAIN COMPONENT
// ==========================================

const CosmicChronometer = ({ 
    date, time, lat, lon, 
    onDateChange, onTimeChange, onLatChange, onLonChange,
    widgets = {}, toggleWidget,
    className = "" 
}) => {
  const svgRef = useRef(null);
  const [activeRing, setActiveRing] = useState(null); 
  const [showPreciseInput, setShowPreciseInput] = useState(false);
  const lastTimeRef = useRef(time);
  const lastDayRef = useRef(getDayOfYear(date));

  // --- Hit Testing Logic ---
  const handlePointerDown = (e) => {
    // If user clicked a Solstice shortcut (handled by onClick), don't drag
    if (e.defaultPrevented) return;

    e.preventDefault(); 
    if (!svgRef.current) return;
    lastTimeRef.current = time;
    lastDayRef.current = getDayOfYear(date);

    const rect = svgRef.current.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const scaleFactor = 320 / rect.width;
    const dx = (e.clientX - (rect.left + cx)) * scaleFactor; 
    const dy = (e.clientY - (rect.top + cy)) * scaleFactor;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    const checkHit = (config) => dist >= (config.r - config.w/2 - 15) && dist <= (config.r + config.w/2 + 15);
    
    if (checkHit(RINGS.DATE)) setActiveRing('date');
    else if (checkHit(RINGS.TIME)) setActiveRing('time');
    else if (checkHit(RINGS.LON)) setActiveRing('lon');
  };

  const handlePointerMove = useCallback((e) => {
    if (!activeRing || !svgRef.current) return;
    e.preventDefault();
    const rect = svgRef.current.getBoundingClientRect();
    const angle = getControlAngle(e.clientX, e.clientY, rect); 

    if (activeRing === 'date') {
        const currentYear = date.getFullYear();
        const newDay = Math.round((angle / 360) * 365);
        const prevDay = lastDayRef.current;
        const diff = newDay - prevDay;
  
        let targetYear = currentYear;
        if (diff < -300) targetYear += 1; 
        else if (diff > 300) targetYear -= 1;
        
        const newDate = getDateFromDayOfYear(targetYear, newDay);
        lastDayRef.current = newDay;
        onDateChange(newDate);
    } 
    else if (activeRing === 'lon') {
        let newLon = angle;
        if (newLon > 180) newLon -= 360; 
        onLonChange(Math.round(newLon));
    } 
    else if (activeRing === 'time') {
        let t = (angle / 360) * 24;
        const prevT = lastTimeRef.current;
        const diff = t - prevT;
        if (diff < -12) {
             const nextDay = new Date(date);
             nextDay.setDate(date.getDate() + 1); onDateChange(nextDay);
        } else if (diff > 12) {
             const prevDay = new Date(date);
             prevDay.setDate(date.getDate() - 1); onDateChange(prevDay);
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

  // --- Date Shortcuts ---
  const handleDateShortcut = (dayIndex) => {
     const newDate = getDateFromDayOfYear(date.getFullYear(), dayIndex);
     onDateChange(newDate);
  };

  const formatDateRing = (d) => { const tempDate = getDateFromDayOfYear(date.getFullYear(), d);
    return tempDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
  const formatLonRing = (l) => `${Math.abs(l)}°${l >= 0 ? 'E' : 'W'}`;
  const formatTimeRing = (t) => formatTime(t);
  
  const handleSyncNow = () => { 
      const n = new Date();
      onDateChange(n); 
      onTimeChange(n.getUTCHours() + n.getUTCMinutes() / 60); 
  };

  return (
    <div className={`bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 flex flex-col items-center select-none overflow-hidden relative ${className}`}>
        
        {/* Precise Input Overlay */}
        {showPreciseInput && (
            <PreciseInputPanel 
                date={date} time={time} lat={lat} lon={lon}
                onDateChange={onDateChange} onTimeChange={onTimeChange}
                onLatChange={onLatChange} onLonChange={onLonChange}
                onClose={() => setShowPreciseInput(false)}
            />
        )}

        {/* Header */}
        <div className="w-full bg-slate-950/50 py-2 border-b border-slate-800 flex justify-center">
            <div className="text-slate-500 text-[10px] font-bold tracking-[0.2em] uppercase flex items-center gap-2">
                <Settings className="w-3 h-3" /> Orbital Chronometer
            </div>
        </div>

        <div className="p-4 flex flex-col w-full gap-4">
            
            {/* Top Section: Dial + Slider */}
            <div className="flex flex-row items-center justify-center gap-4 h-[250px]">
                {/* Latitude Slider */}
                <div className="h-full py-2">
                    <CosmicLatitudeSlider value={lat} onChange={onLatChange} />
                </div>

                {/* Central Dial */}
                <div className="h-full aspect-square relative touch-none cursor-crosshair">
                  <svg ref={svgRef} width="100%" height="100%" viewBox="-160 -160 320 320" onPointerDown={handlePointerDown} className="drop-shadow-2xl">
                    
                    {/* Date Ring with Solstice Shortcuts */}
                    <ControlRing config={RINGS.DATE} value={getDayOfYear(date)} max={365} formatValue={formatDateRing} />
                    
                    <g className="pointer-events-none opacity-40">
                        {/* Labels */}
                        <text x="0" y="-118" textAnchor="middle" className="text-[8px] fill-slate-500 font-mono">DEC SOL</text>
                        <text x="0" y="125" textAnchor="middle" className="text-[8px] fill-slate-500 font-mono">JUN SOL</text>
                    </g>
                    
                    {/* Date Shortcuts (Invisible Click Targets) */}
                    <g className="cursor-pointer" pointerEvents="all">
                        {/* Top (Dec Solstice ~Day 355) */}
                        <circle cx="0" cy="-135" r="10" fill="transparent" onClick={(e) => { e.preventDefault(); handleDateShortcut(355); }} />
                        {/* Bottom (Jun Solstice ~Day 172) */}
                        <circle cx="0" cy="135" r="10" fill="transparent" onClick={(e) => { e.preventDefault(); handleDateShortcut(172); }} />
                        {/* Right (Mar Equinox ~Day 80) */}
                        <circle cx="135" cy="0" r="10" fill="transparent" onClick={(e) => { e.preventDefault(); handleDateShortcut(80); }} />
                         {/* Left (Sep Equinox ~Day 264) */}
                         <circle cx="-135" cy="0" r="10" fill="transparent" onClick={(e) => { e.preventDefault(); handleDateShortcut(264); }} />
                    </g>

                    <ControlRing config={RINGS.TIME} value={time} max={24} formatValue={formatTimeRing} />
                    <g className="pointer-events-none opacity-40">
                        <text x="0" y="-82" textAnchor="middle" className="text-[8px] fill-slate-500 font-mono">00:00</text>
                        <text x="0" y="90" textAnchor="middle" className="text-[8px] fill-slate-500 font-mono">12:00</text>
                    </g>
                    <ControlRing config={RINGS.LON} value={lon} max={360} formatValue={formatLonRing} />
                    
                    <LivingMarble date={date} timeUTC={time} userLon={lon} lat={lat} radius={45} />
                    <g transform="translate(130, 130)" className="opacity-30">
                        <MousePointer2 className="w-6 h-6 text-white" />
                    </g>
                  </svg>
                </div>
            </div>

            {/* Bottom Section: Dashboard */}
            <div className="grid grid-cols-3 gap-2 w-full">
                <DashboardItem 
                    label="DATE" icon={Calendar} 
                    value={date.toLocaleDateString('en-US', { year: '2-digit', month: 'short', day: 'numeric'})} 
                    color={UI_COLORS.dateRing}
                    onEdit={() => setShowPreciseInput(true)} 
                />
                <DashboardItem 
                    label="UTC" icon={Clock} 
                    value={formatTimeRing(time)} 
                    color={UI_COLORS.timeRing} 
                    action={{ label: "NOW", onClick: handleSyncNow }} 
                    onEdit={() => setShowPreciseInput(true)}
                />
                <DashboardItem 
                    label="LOC" icon={Globe} 
                    value={`${Math.abs(lat)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lon)}°${lon >= 0 ? 'E' : 'W'}`} 
                    color={UI_COLORS.lonRing}
                    onEdit={() => setShowPreciseInput(true)} 
                />
            </div>

            {/* Toggles */}
            {toggleWidget && (
                <div className="flex justify-center gap-3 pt-2 border-t border-slate-800/50">
                     {[
                        { key: 'daylight', label: 'Daylight', icon: Sun },
                        { key: 'tides', label: 'Tides', icon: RotateCw },
                        { key: 'map', label: 'Map', icon: MapPin }
                     ].map(opt => (
                        <button key={opt.key} onClick={() => toggleWidget(opt.key)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${widgets[opt.key] ? 'bg-slate-800 border-indigo-500 text-indigo-400' : 'bg-transparent border-slate-800 text-slate-600 hover:text-slate-400'}`}>
                            <opt.icon className="w-3 h-3" /> {opt.label} {widgets[opt.key] && <Check className="w-2 h-2 ml-1" />}
                        </button>
                     ))}
                </div>
            )}
        </div>
    </div>
  );
};

export default CosmicChronometer;