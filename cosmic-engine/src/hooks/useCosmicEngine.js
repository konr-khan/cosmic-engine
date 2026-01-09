import { useMemo } from 'react';
import { 
  getJulianDate, 
  calculateSolarPosition, 
  calculateDaylightDurationPrecise, 
  toRadians, 
  toDegrees 
} from '../utils/astronomy';
import { CONFIG } from '../utils/config';

export const useCosmicEngine = (date, timeOfDay, latitude, longitude, useAnalemma = true) => {
  
  // Safety check to prevent crashes if date is null/undefined during initialization
  const safeDate = date instanceof Date && !isNaN(date) ? date : new Date();
  const year = safeDate.getFullYear();

  // 1. Calculate Real-time Solar & Orbital Data
  // Dependencies: Updates whenever any input changes (User drags slider, time changes, etc.)
  const engineData = useMemo(() => {
    const JD = getJulianDate(safeDate, timeOfDay);
    const { declination, equationOfTime, n } = calculateSolarPosition(JD);
    
    // Solar Noon (UTC) & Day Length
    const eotCorrection = useAnalemma ? equationOfTime : 0;
    const solarNoon = 12 - (longitude / 15) - (eotCorrection / 60);
    const dayLen = calculateDaylightDurationPrecise(latitude, declination, CONFIG.SOLAR.TWILIGHT.OFFICIAL);
    
    // --- Orbital Physics ---
    const { earthOrbitRadius, moonOrbitRadius, daysInYear, earthRadius } = CONFIG.ORBIT;
    
    // Earth Position (Heliocentric)
    const earthTheta = (n / daysInYear) * 2 * Math.PI;
    const earthPos = { 
      x: earthOrbitRadius * Math.cos(earthTheta), 
      y: earthOrbitRadius * Math.sin(earthTheta) 
    };
    
    // Moon Position (Geocentric approximation projected to Heliocentric)
    const meanElongationDeg = 297.85 + (12.19075 * n);
    const angleToSun = earthTheta + Math.PI;
    const moonTheta = angleToSun + toRadians(meanElongationDeg);
    const moonPos = { 
      x: earthPos.x + moonOrbitRadius * Math.cos(moonTheta), 
      y: earthPos.y + moonOrbitRadius * Math.sin(moonTheta) 
    };
    
    // Phases & Angles
    const angleToMoon = Math.atan2(moonPos.y - earthPos.y, moonPos.x - earthPos.x);
    let phaseRad = (angleToMoon - angleToSun) % (2 * Math.PI);
    if (phaseRad < 0) phaseRad += 2 * Math.PI;
    const phase0to1 = phaseRad / (2 * Math.PI);
    
    // Tides
    const alignmentFactor = Math.cos(2 * (angleToMoon - angleToSun));
    // Exaggerated tidal bulge radius for visualization
    const tideRx = earthRadius + 4 + 6 + (3 * alignmentFactor); 
    
    // Tide Status Logic
    const userRotation = ((timeOfDay - 12) * 15) + longitude;
    const moonPhaseAngleDeg = phase0to1 * 360;
    
    let diff = (userRotation - moonPhaseAngleDeg) % 360;
    if (diff < 0) diff += 360;
    
    // High tide is roughly when moon is overhead (0°) or underfoot (180°)
    // We use a 45° buffer window around those points
    const isHighTide = diff <= 45 || diff >= 315 || (diff >= 135 && diff <= 225);

    const getPhaseName = (p) => {
        if (p < 0.03 || p > 0.97) return "New Moon";
        if (p < 0.22) return "Waxing Crescent"; if (p < 0.28) return "First Quarter";
        if (p < 0.47) return "Waxing Gibbous"; if (p < 0.53) return "Full Moon";
        if (p < 0.72) return "Waning Gibbous"; if (p < 0.78) return "Last Quarter";
        return "Waning Crescent";
    };

    return { 
      solarData: {
        dayLength: dayLen,
        civil: calculateDaylightDurationPrecise(latitude, declination, CONFIG.SOLAR.TWILIGHT.CIVIL),
        nautical: calculateDaylightDurationPrecise(latitude, declination, CONFIG.SOLAR.TWILIGHT.NAUTICAL),
        astronomical: calculateDaylightDurationPrecise(latitude, declination, CONFIG.SOLAR.TWILIGHT.ASTRONOMICAL),
        sunrise: solarNoon - (dayLen / 2),
        sunset: solarNoon + (dayLen / 2),
        solarNoon, 
        equationOfTime: eotCorrection, 
        daysSinceEpoch: n,
        noonElevation: 90 - Math.abs(latitude - declination),
        declination, 
        isPolarNight: dayLen <= 0, 
        isMidnightSun: dayLen >= 24
      }, 
      orbitalData: {
        positions: { sun: { x: 0, y: 0 }, earth: earthPos, moon: moonPos },
        angles: { 
          toSun: angleToSun, 
          toMoon: angleToMoon, 
          sunDegrees: toDegrees(Math.atan2(Math.sin(angleToSun), Math.cos(angleToSun))), 
          moonDegrees: toDegrees(angleToMoon), 
        },
        phase: { value: phase0to1, name: getPhaseName(phase0to1) },
        tides: { 
          rx: tideRx, 
          ry: earthRadius + 4, 
          type: alignmentFactor > 0.8 ? "Spring Tide" : (alignmentFactor < -0.8 ? "Neap Tide" : "Transitional"), 
          alignment: alignmentFactor 
        },
        userRotation,
        localTideStatus: isHighTide ? "High Tide" : "Low Tide"
      }
    };
  }, [safeDate, timeOfDay, latitude, longitude, useAnalemma]);

  // 2. Calculate Annual Data (The Graph)
  // OPTIMIZATION FIX: Depends on 'year', not 'date'. 
  // This prevents recalculating the whole year when dragging the day slider.
  const annualData = useMemo(() => {
    const data = [];
    // We use a fixed hour (12) to get a representative calculation for each day
    for (let i = 0; i <= 365; i++) {
       const jd = getJulianDate(new Date(year, 0, i + 1), 12); 
       const { declination } = calculateSolarPosition(jd);
       data.push({ 
         day: i + 1, 
         length: parseFloat(calculateDaylightDurationPrecise(latitude, declination, CONFIG.SOLAR.TWILIGHT.OFFICIAL).toFixed(2)) 
       });
    }
    return data;
  }, [latitude, year]); // <--- Dependency changed from 'date' to 'year'

  return { ...engineData, annualData };
};