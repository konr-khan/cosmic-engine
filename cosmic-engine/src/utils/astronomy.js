// ==========================================
// ASTRONOMY MATH UTILITIES
// ==========================================

// Constants for readability and centralization
const J2000_EPOCH = 2451545.0;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

// Helper: Normalize any angle to 0...360 range (handles negatives correctly)
const normalizeDeg = (angle) => ((angle % 360) + 360) % 360;

export const toRadians = (deg) => deg * DEG2RAD;
export const toDegrees = (rad) => rad * RAD2DEG;

/**
 * Formats decimal hours into HH:MM:SS
 * Now uses modulo math instead of loops for better performance/safety
 */
export const formatTime = (decimalHours) => {
  if (isNaN(decimalHours) || decimalHours === null) return "--:--";
  
  // Normalize to 0-24 range
  let normalized = ((decimalHours % 24) + 24) % 24;
  
  let hours = Math.floor(normalized);
  let minutes = Math.floor((normalized - hours) * 60);
  let seconds = Math.round(((normalized - hours) * 60 - minutes) * 60);

  // Handle rounding edge case (e.g. 59.999 seconds rounds up to 60)
  if (seconds === 60) {
      seconds = 0;
      minutes += 1;
  }
  if (minutes === 60) {
      minutes = 0;
      hours += 1;
  }
  if (hours === 24) {
      hours = 0;
  }

  return [hours, minutes, seconds]
    .map(v => v.toString().padStart(2, '0'))
    .join(':');
};

// --- Ephemeris Math (J2000 Epoch) ---

/**
 * Calculates Julian Date from a Date object and decimal UTC hour.
 * Note: Extracts Year/Month/Day from the Local Time of the date object.
 */
export const getJulianDate = (date, timeOfDay) => {
  let y = date.getFullYear();
  let m = date.getMonth() + 1;
  const day = date.getDate();

  // Adjust for Jan/Feb (treated as months 13/14 of previous year)
  if (m <= 2) { 
    y -= 1; 
    m += 12; 
  }

  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);

  return Math.floor(365.25 * (y + 4716)) + 
         Math.floor(30.6001 * (m + 1)) + 
         day + B - 1524.5 + (timeOfDay / 24.0);
};

/**
 * Low-precision solar coordinates (Accuracy: ~1 arcminute)
 * Sufficient for day/night maps and general UI visualization.
 */
export const calculateSolarPosition = (julianDate) => {
  const n = julianDate - J2000_EPOCH;

  // Mean Longitude (L) & Mean Anomaly (g)
  let L = normalizeDeg(280.460 + 0.9856474 * n);
  let g = normalizeDeg(357.528 + 0.9856003 * n);
  
  const gRad = toRadians(g);

  // Ecliptic Longitude (lambda)
  const lambda = L + 1.915 * Math.sin(gRad) + 0.020 * Math.sin(2 * gRad);
  const lambdaRad = toRadians(lambda);

  // Obliquity of the Ecliptic (epsilon)
  // Linear approximation is sufficient for +/- 100 years from J2000
  const epsilon = 23.439 - 0.0000004 * n;
  const epsRad = toRadians(epsilon);

  // Right Ascension (alpha)
  const alphaRad = Math.atan2(
    Math.cos(epsRad) * Math.sin(lambdaRad), 
    Math.cos(lambdaRad)
  );
  const alpha = normalizeDeg(toDegrees(alphaRad));

  // Declination (delta)
  const deltaRad = Math.asin(Math.sin(epsRad) * Math.sin(lambdaRad));
  const declination = toDegrees(deltaRad);

  // Equation of Time (in minutes)
  // Logic: Difference between Mean Longitude and Right Ascension
  // Normalized to -180...180 range to prevent jumps
  let diff = L - alpha;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  
  // Convert degrees difference to minutes of time (1 deg = 4 min)
  const equationOfTime = 4 * diff; 

  return { declination, equationOfTime, n };
};

/**
 * Calculates length of day based on latitude and solar declination.
 * @param {number} angleThreshold - Sun altitude (e.g., -0.833 for sunrise/set, -6 for civil twilight)
 */
export const calculateDaylightDurationPrecise = (lat, declination, angleThreshold = -0.833) => {
  // Clamp latitude to avoid infinity at exact poles
  const safeLat = Math.max(-89.9, Math.min(89.9, lat));
  
  const latRad = toRadians(safeLat);
  const decRad = toRadians(declination);
  const altRad = toRadians(angleThreshold);

  // Standard Sunrise Equation
  // cos(w) = (sin(alt) - sin(lat)*sin(dec)) / (cos(lat)*cos(dec))
  const numerator = Math.sin(altRad) - Math.sin(latRad) * Math.sin(decRad);
  const denominator = Math.cos(latRad) * Math.cos(decRad);
  const cosOmega = numerator / denominator;

  // Polar Day (Sun never sets)
  if (cosOmega <= -1) return 24.0;
  
  // Polar Night (Sun never rises)
  if (cosOmega >= 1) return 0.0;

  // Hour Angle to Hours
  const omega = toDegrees(Math.acos(cosOmega));
  return (2 * omega) / 15;
};
// Calculates the UTC start and end times for a specific solar altitude
// Returns [start, end] in decimal hours (e.g., [6.5, 18.5])
export const getSunHours = (lat, declination, angleThreshold = -0.833) => {
  const safeLat = Math.max(-89.9, Math.min(89.9, lat));
  const latRad = toRadians(safeLat);
  const decRad = toRadians(declination);
  const altRad = toRadians(angleThreshold);

  // cos(H) = (sin(Alt) - sin(Lat)sin(Dec)) / (cos(Lat)cos(Dec))
  const cosH = (Math.sin(altRad) - Math.sin(latRad) * Math.sin(decRad)) / 
               (Math.cos(latRad) * Math.cos(decRad));

  // Polar Conditions
  if (cosH < -1) return [0, 24]; // Midnight Sun (Always up)
  if (cosH > 1) return [12, 12]; // Polar Night (Never up)

  const H = toDegrees(Math.acos(cosH));
  const hourOffset = H / 15;
  
  // Solar Noon is assumed at 12:00 UTC for this abstract chart
  return [12 - hourOffset, 12 + hourOffset];
};