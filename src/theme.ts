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
	// pink / pale-yellow / mint / sky-blue / lavender pastels, on a lavender base.
	// A lively light theme. Since the base is a mid-light purple, the foreground
	// avoids the purple family (it would blend in) and runs deep enough to read:
	// candy-pink values, deep-teal labels/chrome, and a blue-to-rose zone ramp.
	Marshmallow: {
		background: 'e4c1f9', // lavender base
		textPrimary: '000000',
		textSecondary: '167d8a', // deep teal — labels, axis numbers, footer
		axis: ['167d8a', 0.45], // soft teal baseline
		grid: ['167d8a', 0.25], // faint teal gridlines
		resting: '5cc4a8', // mint-teal line
		heart: 'fcf6bd',
		zones: [
			{ max: 60, color: '2d7ac9' }, // resting / low — candy blue
			{ max: 100, color: 'f25fa0' }, // normal — candy pink
			{ max: Number.POSITIVE_INFINITY, color: 'd92f5e' }, // elevated — deep rose
		],
	},
	// navy / slate-blue / off-white / taupe / brown. A warm, earthy theme on the
	// brown base with cool accents: cream text, a navy-to-cream zone ramp (so the
	// common normal zone reads as blue-on-brown), a slate-blue heart, and a soft
	// taupe resting line. Taupe blends into the brown base, so it stays a subtle
	// line rather than a bar color.
	Stranding: {
		background: '8b786d', // warm brown base
		textPrimary: 'ebf5ee', // off-white
		textSecondary: ['ebf5ee', 0.65],
		axis: ['ebf5ee', 0.3],
		grid: ['ebf5ee', 0.2],
		resting: 'bfa89e', // soft taupe line
		heart: 'ebf5ee',
		zones: [
			{ max: 60, color: '78a1bb' }, // resting — slate-blue
			{ max: 100, color: '283044' }, // normal / low — navy
			{ max: Number.POSITIVE_INFINITY, color: 'ebf5ee' }, // elevated — off-white
		],
	},
	// pale-lime / neon-green / mid-purple / dark-purple / coral. The EVA-01
	// scheme: a deep-purple base with a glowing neon-green core. Pale-lime text,
	// and zones that go subtle mid-purple (rest recedes into the body) to neon
	// green (the common active range) to coral (elevated).
	Shogoki: {
		background: '523874', // deep purple base
		textPrimary: 'c7fba5', // pale lime
		textSecondary: ['c7fba5', 0.6],
		axis: ['c7fba5', 0.28],
		grid: ['c7fba5', 0.22],
		resting: ['c7fba5', 0.4], // faint pale-lime line
		heart: 'dc7d68', // coral
		zones: [
			{ max: 60, color: '916cad' }, // resting / low — mid-purple
			{ max: 100, color: 'adf182' }, // normal — neon green
			{ max: Number.POSITIVE_INFINITY, color: 'dc7d68' }, // elevated — coral
		],
	},
}

// The first declared theme, used as the fallback whenever a selected name is
// not a defined theme.
export const FIRST_THEME = Object.keys(THEMES)[0]!

// Resolve a theme name to its palette, falling back to the first theme.
export function resolveTheme(name: string): Theme {
	return THEMES[name] ?? THEMES[FIRST_THEME]!
}

export function zoneColor(theme: Theme, bpm: number): Color {
	for (const zone of theme.zones) {
		if (bpm < zone.max) return zone.color
	}
	return theme.zones[theme.zones.length - 1]!.color
}
