import { expect, test } from 'bun:test'
import { FIRST_THEME, resolveTheme, THEMES, zoneColor } from './theme'

test('resolveTheme: returns the named theme', () => {
	expect(resolveTheme('Blueprint')).toBe(THEMES.Blueprint!)
	expect(resolveTheme('Sourberry')).toBe(THEMES.Sourberry!)
})

test('resolveTheme: an unknown name falls back to the first theme', () => {
	expect(resolveTheme('Nope')).toBe(THEMES[FIRST_THEME]!)
})

test('FIRST_THEME is the first declared theme', () => {
	expect(FIRST_THEME).toBe(Object.keys(THEMES)[0]!)
	expect(FIRST_THEME).toBe('Blueprint')
})

test('every theme defines all color roles and a well-formed zone ramp', () => {
	const roles = [
		'background',
		'textPrimary',
		'textSecondary',
		'axis',
		'grid',
		'resting',
		'heart',
	] as const
	for (const theme of Object.values(THEMES)) {
		for (const role of roles) expect(theme[role]).toBeDefined()
		expect(theme.zones.length).toBeGreaterThan(0)
		// The last zone is open-ended so any value resolves to a color.
		expect(theme.zones[theme.zones.length - 1]!.max).toBe(
			Number.POSITIVE_INFINITY,
		)
	}
})

test('zoneColor: first zone the value is strictly below, else the last', () => {
	const t = THEMES.Blueprint!
	expect(zoneColor(t, 50)).toBe('8390fa') // < 60
	expect(zoneColor(t, 80)).toBe('fac748') // < 100
	expect(zoneColor(t, 150)).toBe('f88dad') // open-ended top
	expect(zoneColor(t, 60)).toBe('fac748') // boundary is not < 60
})
