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

// Within one hour, sorted readings more than this many BPM apart start a new
// segment, so an outlier (e.g. a brief spike) shows detached from the main
// band instead of being bridged into one tall bar. This is a value-distance
// gap, not a time gap; very sparse sampling during a fast climb can fragment.
export const SEGMENT_GAP_BPM = 25

// Palette: twilight-indigo / wisteria-blue / tuscan-sun / lavender-blush /
// bubblegum-tint. The widget paints a fixed dark indigo canvas (system families
// only; lock-screen families stay clear), so text and chrome use explicit light
// palette colors rather than the system primary/secondary, which would turn
// dark in light mode and vanish on the fixed background.
export const BACKGROUND = '1d2f6f' // twilight-indigo canvas
export const TEXT_PRIMARY: Color = 'f9e9ec' // lavender-blush
export const TEXT_SECONDARY: Color = ['f9e9ec', 0.6] // muted lavender
export const AXIS_COLOR: Color = ['f9e9ec', 0.28] // lavender baseline
export const GRID_COLOR: Color = ['f9e9ec', 0.15] // lavender gridlines
export const RESTING_COLOR: Color = ['fac748', 0.85] // tuscan resting line

// Heart-rate zones: three well-separated palette hues so they stay legible at
// thin bar widths (bar height already carries intensity). wisteria rest /
// tuscan normal / bubblegum elevated. `zoneColor` returns the first zone whose
// `max` the value is strictly below.
export const ZONES: Array<{ max: number; color: Color }> = [
	{ max: 60, color: '8390fa' }, // resting / low — wisteria-blue
	{ max: 100, color: 'fac748' }, // normal — tuscan-sun
	{ max: Number.POSITIVE_INFINITY, color: 'f88dad' }, // elevated — bubblegum-tint
]

export function zoneColor(bpm: number): Color {
	for (const zone of ZONES) {
		if (bpm < zone.max) return zone.color
	}
	return ZONES[ZONES.length - 1]!.color
}
