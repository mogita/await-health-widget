export const HOUR_MS = 3_600_000
export const DAY_HOURS = 24

// Refresh cadence. Heart rate trickles in through the day; ~15 min keeps the
// chart fresh without asking iOS to wake the widget too aggressively.
export const REFRESH_MS = 15 * 60 * 1000

// Y-axis (BPM) domain shaping. The axis floors/ceils to the day's own min/max;
// these only cover the no-data fallback and a minimum span for a flat day.
export const DEFAULT_DOMAIN_LO = 40
export const DEFAULT_DOMAIN_HI = 140
export const MIN_DOMAIN_SPAN = 16

// Smallest candle body in points, so a single-reading hour stays visible.
export const MIN_BODY = 3

// Within one hour, sorted readings more than this many BPM apart start a new
// segment, so an outlier (e.g. a brief spike) shows detached from the main
// band instead of being bridged into one tall bar. This is a value-distance
// gap, not a time gap; very sparse sampling during a fast climb can fragment.
export const SEGMENT_GAP_BPM = 25

// Colors live in the theme system (see theme.ts): the widget paints a fixed
// dark canvas (system families only; lock-screen families stay clear), so text
// and chrome use explicit theme colors rather than the system primary/secondary,
// which would turn dark in light mode and vanish on the fixed background.
