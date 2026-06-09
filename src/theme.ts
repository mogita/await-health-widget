// Color theme system. A Theme maps every color role the widget paints. To add
// a palette: add an entry to THEMES here AND its Title-Cased name to the
// `theme` @panel menu items in panels.ts (the menu list is a static literal and
// cannot be derived from this record).
export type Theme = {
	background: Color
	textPrimary: Color
	textSecondary: Color
	axis: Color // bottom baseline
	grid: Color // vertical hour gridlines
	resting: Color // pale resting-rate line
	heart: Color // header heart glyph
	// Heart-rate zones, low to high (cool to warm). `zoneColor` returns the
	// first zone whose `max` the value is strictly below.
	zones: Array<{ max: number; color: Color }>
}

export const THEMES: Record<string, Theme> = {
	// twilight-indigo / wisteria-blue / tuscan-sun / lavender-blush / bubblegum.
	Blueprint: {
		background: '1d2f6f',
		textPrimary: 'f9e9ec',
		textSecondary: ['f9e9ec', 0.6],
		axis: ['f9e9ec', 0.28],
		grid: ['f9e9ec', 0.22],
		resting: ['fac748', 0.4],
		heart: 'f88dad',
		zones: [
			{ max: 60, color: '8390fa' }, // resting / low
			{ max: 100, color: 'fac748' }, // normal
			{ max: Number.POSITIVE_INFINITY, color: 'f88dad' }, // elevated
		],
	},
	// tomato / pacific-blue / mustard / alabaster-grey / ghost-white. A light
	// theme: ghost-white canvas with the vivids as the cool-to-warm zone ramp.
	// The palette has no dark tone, so text/axis/grid use a derived dark ink for
	// legibility on the light background.
	Sourberry: {
		background: 'f4f4f8', // ghost-white canvas
		textPrimary: '212227', // dark ink (derived; palette has no dark tone)
		textSecondary: ['212227', 0.55],
		axis: ['212227', 0.25],
		grid: ['212227', 0.12],
		resting: ['2ab7ca', 0.55], // soft pacific-blue, ties to the rest zone
		heart: 'fe4a49', // tomato
		zones: [
			{ max: 60, color: '2ab7ca' }, // resting / low — pacific-blue
			{ max: 100, color: 'F6CB4A' }, // normal — mustard
			{ max: Number.POSITIVE_INFINITY, color: 'fe4a49' }, // elevated — tomato
		],
	},
	// olive / leaf-green / mint / teal / slate-green. A dark theme. The palette
	// greens cluster in mid-lightness (only the mint is truly light), so a
	// derived deep forest-green canvas keeps the zone greens legible; the mint is
	// the light text. Zones brighten as the rate climbs (olive < teal < leaf).
	Deepforest: {
		background: '0f1f16', // derived deep forest-green canvas
		textPrimary: '9ffcdf', // pale mint
		textSecondary: ['9ffcdf', 0.6],
		axis: ['9ffcdf', 0.28],
		grid: ['9ffcdf', 0.22],
		resting: ['9ffcdf', 0.4], // pale mint, distinct from the zone greens
		heart: '6cc551', // leaf-green
		zones: [
			{ max: 60, color: '447604' }, // resting / low — olive
			{ max: 100, color: '52ad9c' }, // normal — teal
			{ max: Number.POSITIVE_INFINITY, color: '6cc551' }, // elevated — leaf-green
		],
	},
}

export const DEFAULT_THEME = 'Blueprint'

// Resolve a panel-selected theme name, falling back to the default.
export function resolveTheme(name: string): Theme {
	return THEMES[name] ?? THEMES[DEFAULT_THEME]!
}

export function zoneColor(theme: Theme, bpm: number): Color {
	for (const zone of theme.zones) {
		if (bpm < zone.max) return zone.color
	}
	return theme.zones[theme.zones.length - 1]!.color
}
