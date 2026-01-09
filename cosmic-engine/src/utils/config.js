export const CONFIG = {
  THEME: {
    NIGHT_BG: "#1e293b",
    NIGHT_STROKE: "#0f172a",
    DAY_FILL: "#3b82f6",
    SUN_FILL: "#fbbf24",
    SUN_STROKE: "#ffffff",
    GRID_STROKE: "#94a3b8",
    TIDE_HIGH: "text-blue-600",
    TIDE_LOW: "text-slate-500",
    ACCENT: "#6366f1"
  },
  SOLAR: {
    TWILIGHT: { OFFICIAL: -0.833, CIVIL: -6.0, NAUTICAL: -12.0, ASTRONOMICAL: -18.0 }
  },
  ORBIT: {
    earthOrbitRadius: 200, moonOrbitRadius: 60, earthRadius: 12, moonRadius: 6,
    daysInYear: 365.25, daysInLunarCycle: 29.53
  },
  DATES: [
    { day: 79, label: "Equinox (Mar)", short: "Mar Eq" },
    { day: 172, label: "Solstice (Jun)", short: "Jun Sol" },
    { day: 266, label: "Equinox (Sep)", short: "Sep Eq" },
    { day: 355, label: "Solstice (Dec)", short: "Dec Sol" },
  ],
  LAT_PRESETS: [
    { lat: 90, label: "N. Pole" }, { lat: 66.5, label: "Arctic Circle" },
    { lat: 23.5, label: "Tropic of Cancer" }, { lat: 0, label: "Equator" },
    { lat: -23.5, label: "Tropic of Capricorn" }, { lat: -66.5, label: "Antarctic Circle" },
    { lat: -90, label: "S. Pole" },
  ]
};