export const HOUR_MS = 3_600_000
export const DAY_HOURS = 24

// Refresh cadence. Heart rate trickles in through the day; ~15 min keeps the
// chart fresh without asking iOS to wake the widget too aggressively.
export const REFRESH_MS = 15 * 60 * 1000

// Y-axis (BPM) domain shaping.
export const DEFAULT_DOMAIN_LO = 40
export const DEFAULT_DOMAIN_HI = 140
export const DOMAIN_PAD_RATIO = 0.12
export const MIN_DOMAIN_PAD = 6
export const MIN_DOMAIN_SPAN = 24

// Smallest candle body in points, so a single-reading hour stays visible.
export const MIN_BODY = 3

// Widget chrome colors. BACKGROUND is the named system background (system
// families only; lock-screen families stay clear). AXIS_COLOR is a faint gray.
export const BACKGROUND = 'background'
export const AXIS_COLOR: Color = ['gray', 0.25]

// Heart-rate zones, ordered low to high. `zoneColor` returns the first zone
// whose `max` the value is strictly below.
export const ZONES: Array<{ max: number; color: Color }> = [
	{ max: 60, color: '5AC8FA' }, // resting / low
	{ max: 100, color: '34C759' }, // normal
	{ max: 140, color: 'FFD60A' }, // elevated
	{ max: 170, color: 'FF9500' }, // high
	{ max: Number.POSITIVE_INFINITY, color: 'FF375F' }, // peak
]

export function zoneColor(bpm: number): Color {
	for (const zone of ZONES) {
		if (bpm < zone.max) return zone.color
	}
	return ZONES[ZONES.length - 1]!.color
}
