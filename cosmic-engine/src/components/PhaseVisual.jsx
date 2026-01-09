import React, { useMemo } from 'react';
import PropTypes from 'prop-types';

const CONFIG = {
  COLORS: {
    BG: "#1e293b",      // Dark Slate (Night Sky)
    STROKE: "#475569",  // Lighter Slate (Moon Border)
    LIT: "#f1f5f9",     // White/Grey (Lit Surface)
    EARTHSHINE: "#334155" // Optional: darker fill for the shadow side if transparent isn't desired
  }
};

/**
 * Returns a human-readable string for the moon phase.
 */
const getPhaseLabel = (phase) => {
  if (phase <= 0.02 || phase >= 0.98) return "New Moon";
  if (phase < 0.24) return "Waxing Crescent";
  if (phase < 0.26) return "First Quarter";
  if (phase < 0.48) return "Waxing Gibbous";
  if (phase <= 0.52) return "Full Moon";
  if (phase < 0.74) return "Waning Gibbous";
  if (phase < 0.76) return "Last Quarter";
  return "Waning Crescent";
};

const PhaseVisual = ({ phase = 0, size = 64, hemisphere = 'northern' }) => {
  // Memoize geometry calculations to prevent recalculation on every render
  const { pathData, isFullMoon, isNewMoon, phaseLabel } = useMemo(() => {
    // 1. Normalize phase to 0-1
    const p = phase - Math.floor(phase);
    
    // 2. Geometry Constants based on 'size' prop
    const c = size / 2;      // Center (32)
    const r = size * 0.375;  // Radius (24) - roughly 37.5% of container
    const yTop = c - r;      // (8)
    const yBot = c + r;      // (56)

    // 3. Determine Sweep Logic
    // Northern Hemisphere: Waxing (0-0.5) fills from Right. Waning fills from Left.
    // Southern Hemisphere: Waxing fills from Left. Waning fills from Right.
    const isWaxing = p < 0.5;
    const isLitRight = hemisphere === 'northern' ? isWaxing : !isWaxing;

    // 4. Calculate Terminator Radius (The horizontal bulge of the shadow)
    // cos(0) = 1 (Full bulge), cos(PI/2) = 0 (Straight line at Quarter)
    const rx = r * Math.cos(p * 2 * Math.PI);
    const rxAbs = Math.abs(rx);

    // 5. Draw Logic
    let d = "";
    
    if (isLitRight) {
      // Draw Right Semi-Circle (Limb)
      // Move to Top -> Arc to Bottom (Clockwise)
      // Then Draw Terminator from Bottom -> Top
      // Sweep for terminator depends on if we are Crescent (<0.25) or Gibbous (>0.25)
      // Note: Math.cos is positive for Crescent, negative for Gibbous.
      // We use that sign to flip the terminator sweep.
      const termSweep = rx > 0 ? 0 : 1; 
      d = `M ${c},${yTop} A ${r},${r} 0 0,1 ${c},${yBot} A ${rxAbs},${r} 0 0,${termSweep} ${c},${yTop}`;
    } else {
      // Draw Left Semi-Circle
      // Move to Bottom -> Arc to Top (Clockwise)
      const termSweep = rx > 0 ? 0 : 1;
      d = `M ${c},${yBot} A ${r},${r} 0 0,1 ${c},${yTop} A ${rxAbs},${r} 0 0,${termSweep} ${c},${yBot}`;
    }

    return {
      pathData: d,
      isNewMoon: p <= 0.02 || p >= 0.98,
      isFullMoon: p > 0.48 && p < 0.52,
      phaseLabel: getPhaseLabel(p)
    };
  }, [phase, size, hemisphere]);

  // Derived dimensions for the base circle
  const center = size / 2;
  const radius = size * 0.375;

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox={`0 0 ${size} ${size}`} 
      className="drop-shadow-md"
      role="img"
      aria-label={`Moon Phase: ${phaseLabel}`}
    >
      <title>{phaseLabel}</title>
      
      {/* 1. The Dark Base (Shadow Side) */}
      <circle 
        cx={center} 
        cy={center} 
        r={radius} 
        fill={CONFIG.COLORS.BG} 
        stroke={CONFIG.COLORS.STROKE} 
        strokeWidth={size * 0.03} 
      />

      {/* 2. The Lit Portion */}
      {!isNewMoon && !isFullMoon && (
        <path d={pathData} fill={CONFIG.COLORS.LIT} />
      )}

      {/* 3. Full Moon Overlay (Prevents SVG artifacting at 50%) */}
      {isFullMoon && (
        <circle cx={center} cy={center} r={radius} fill={CONFIG.COLORS.LIT} />
      )}
    </svg>
  );
};

PhaseVisual.propTypes = {
  phase: PropTypes.number.isRequired,
  size: PropTypes.number,
  hemisphere: PropTypes.oneOf(['northern', 'southern']),
};

export default PhaseVisual;