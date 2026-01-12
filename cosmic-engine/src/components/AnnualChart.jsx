import React, { useState, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { CONFIG } from '../utils/config';
import { toRadians, getSunHours, formatTime } from '../utils/astronomy';

const CustomTooltip = React.memo(({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const date = new Date(new Date().getFullYear(), 0, label);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return (
            <div className="bg-slate-800 px-3 py-2 rounded shadow border border-slate-700 text-xs font-mono">
                <span className="font-bold text-slate-200">{dateStr}</span>
            </div>
        );
    }
    return null;
});

const AnnualChart = ({ latitude = 47, currentDay, onDayChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [hoverDay, setHoverDay] = useState(null);
  
  const almanacData = useMemo(() => {
    const data = [];
    for (let day = 1; day <= 365; day++) {
      const declination = 23.44 * Math.sin(toRadians((360 / 365) * (day - 81)));
      
      const astro = getSunHours(latitude, declination, -18);   
      const naut = getSunHours(latitude, declination, -12);    
      const civil = getSunHours(latitude, declination, -6);    
      const sun = getSunHours(latitude, declination, -0.833);  

      data.push({
        day,
        astro,
        naut,
        civil,
        sun,
        dayLength: sun[1] - sun[0]
      });
    }
    return data;
  }, [latitude]);

  const activeDay = hoverDay !== null ? hoverDay : currentDay;
  const activeData = almanacData[activeDay - 1];

  const handleInteraction = (e) => { 
    if (e && e.activeLabel) { 
        if (isDragging || e.type === 'click') {
            onDayChange(Number(e.activeLabel));
        }
        setHoverDay(Number(e.activeLabel));
    } 
  };

  const formatShortTime = (decimal) => formatTime(decimal).slice(0, 5);

  return (
    <div className="bg-slate-900 rounded-2xl shadow-lg border border-slate-800 p-6 h-full flex flex-col select-none">
      <div className="mb-6 flex justify-between items-end">
        <div>
           <h3 className="text-lg font-bold text-slate-200">Solar Almanac</h3>
           <p className="text-xs text-slate-500 font-mono mt-1">LATITUDE: {latitude}° (SOLAR TIME)</p>
        </div>
        {activeData && (
            <div className="text-right">
                <div className="text-xs font-bold text-amber-500 uppercase tracking-wider">Daylight</div>
                <div className="font-mono text-slate-300 font-bold">
                    {formatShortTime(activeData.sun[0])} - {formatShortTime(activeData.sun[1])}
                </div>
            </div>
        )}
      </div>
      
      <div className="flex-1 w-full min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart 
            data={almanacData} 
            margin={{ top: 20, right: 0, bottom: 20, left: -20 }} 
            onMouseDown={(e) => { setIsDragging(true); handleInteraction(e); }} 
            onMouseMove={handleInteraction} 
            onMouseUp={() => setIsDragging(false)} 
            onMouseLeave={() => { setIsDragging(false); setHoverDay(null); }} 
            onClick={handleInteraction} 
            style={{ cursor: isDragging ? 'grabbing' : 'crosshair' }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
            
            <XAxis 
                dataKey="day" 
                type="number" 
                domain={[1, 365]} 
                ticks={CONFIG.DATES.map(d => d.day)} 
                tickFormatter={(tick) => CONFIG.DATES.find(d => d.day === tick)?.short || ""} 
                stroke="#64748b" 
                tick={{fontSize: 10, fontWeight: 'bold', fill: '#64748b'}} 
                interval={0} 
            />
            
            <YAxis 
                domain={[0, 24]} 
                ticks={[0, 4, 8, 12, 16, 20, 24]} 
                stroke="#64748b" 
                tick={{fontSize: 12}} 
                reversed={true} 
            />
            
            <RechartsTooltip content={<CustomTooltip />} />
            
            {/* Layers */}
            <Area dataKey="astro" stroke="none" fill="#1e293b" fillOpacity={1} isAnimationActive={false} />
            <Area dataKey="naut" stroke="none" fill="#334155" fillOpacity={1} isAnimationActive={false} />
            <Area dataKey="civil" stroke="none" fill="#475569" fillOpacity={1} isAnimationActive={false} />
            <Area dataKey="sun" stroke="none" fill="#fbbf24" fillOpacity={0.8} isAnimationActive={false} />

            {/* Dynamic Solar Contours (Now using CONFIG.THEME.ACCENT) */}
            {activeData && (
                <>
                    <ReferenceLine 
                        y={activeData.sun[0]} 
                        stroke={CONFIG.THEME.ACCENT} 
                        strokeDasharray="4 4" 
                        strokeOpacity={0.8} 
                    />
                    <ReferenceLine 
                        y={activeData.sun[1]} 
                        stroke={CONFIG.THEME.ACCENT} 
                        strokeDasharray="4 4" 
                        strokeOpacity={0.8} 
                    />
                </>
            )}

            {/* Current Day Vertical Line */}
            <ReferenceLine x={activeDay} stroke={CONFIG.THEME.ACCENT} strokeDasharray="3 3" />
            
            {/* Month Separators */}
            {CONFIG.DATES.map(kd => (
                <ReferenceLine key={kd.day} x={kd.day} stroke="#cbd5e1" strokeDasharray="2 2" opacity={0.2} />
            ))}

          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AnnualChart;