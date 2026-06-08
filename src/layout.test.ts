import { expect, test } from 'bun:test'
import { MIN_BODY } from './config'
import type { Domain } from './health'
import {
	bpmTicks,
	classifyFamily,
	computeLayout,
	segmentGeometry,
	valueToY,
} from './layout'

const DOMAIN: Domain = { lo: 50, hi: 150 }

// classifyFamily

test('classifyFamily: accessoryInline is inline', () => {
	expect(classifyFamily('accessoryInline')).toBe('inline')
})

test('classifyFamily: circular and rectangular are compact', () => {
	expect(classifyFamily('accessoryCircular')).toBe('compact')
	expect(classifyFamily('accessoryRectangular')).toBe('compact')
})

test('classifyFamily: system families are system', () => {
	for (const family of [
		'small',
		'medium',
		'large',
		'extraLarge',
		'unknown',
	] as const) {
		expect(classifyFamily(family)).toBe('system')
	}
})

// computeLayout

test('computeLayout: 24 equal slots fill the plot, bars thinner than slots', () => {
	const layout = computeLayout({ width: 360, height: 340 }, 'system')
	expect(layout.slot * 24).toBeCloseTo(layout.plotWidth, 6)
	expect(layout.barWidth).toBeGreaterThan(0)
	expect(layout.barWidth).toBeLessThan(layout.slot)
	expect(layout.plotHeight).toBeGreaterThan(0)
})

test('computeLayout: bar width is capped so wide widgets do not look fat', () => {
	const layout = computeLayout({ width: 720, height: 680 }, 'system')
	expect(layout.barWidth).toBeLessThanOrEqual(7)
})

test('computeLayout: large widget shows header and axis', () => {
	const layout = computeLayout({ width: 360, height: 340 }, 'system')
	expect(layout.showHeader).toBe(true)
	expect(layout.showAxis).toBe(true)
})

test('computeLayout: tiny compact widget still keeps all 24 bars', () => {
	const layout = computeLayout({ width: 76, height: 76 }, 'compact')
	expect(layout.showHeader).toBe(false)
	expect(layout.showAxis).toBe(false)
	expect(layout.barWidth).toBeGreaterThanOrEqual(0.5)
})

test('computeLayout: short system widget drops chrome to keep the plot', () => {
	const layout = computeLayout({ width: 160, height: 70 }, 'system')
	expect(layout.showHeader).toBe(false)
	expect(layout.plotHeight).toBeGreaterThan(0)
})

test('computeLayout: wide system widget reserves the y-axis label strip', () => {
	const layout = computeLayout({ width: 360, height: 340 }, 'system')
	expect(layout.showYAxis).toBe(true)
	expect(layout.yLabelWidth).toBeGreaterThan(0)
	// Plot is narrower than the inner width by the label strip + its gap.
	expect(layout.plotWidth).toBeLessThan(360 - 24)
})

test('computeLayout: small system shows the y-axis; compact omits it', () => {
	expect(computeLayout({ width: 160, height: 160 }, 'system').showYAxis).toBe(
		true,
	)
	expect(computeLayout({ width: 160, height: 160 }, 'compact').showYAxis).toBe(
		false,
	)
})

test('computeLayout: a degenerately narrow widget omits the y-axis', () => {
	expect(computeLayout({ width: 100, height: 160 }, 'system').showYAxis).toBe(
		false,
	)
})

// bpmTicks

test('bpmTicks: round 25-step stops inside a ~100bpm domain', () => {
	expect(bpmTicks({ lo: 41, hi: 149 })).toEqual([50, 75, 100, 125])
})

test('bpmTicks: 10-step stops for a tight domain', () => {
	expect(bpmTicks({ lo: 60, hi: 90 })).toEqual([60, 70, 80, 90])
})

test('bpmTicks: 50-step stops for a wide domain', () => {
	expect(bpmTicks({ lo: 50, hi: 250 })).toEqual([50, 100, 150, 200, 250])
})

test('bpmTicks: every stop lies within the domain', () => {
	for (const d of [
		{ lo: 41, hi: 149 },
		{ lo: 55, hi: 72 },
		{ lo: 48, hi: 210 },
	]) {
		const ticks = bpmTicks(d)
		expect(ticks.length).toBeGreaterThanOrEqual(1)
		for (const t of ticks) {
			expect(t).toBeGreaterThanOrEqual(d.lo)
			expect(t).toBeLessThanOrEqual(d.hi)
		}
	}
})

// valueToY

test('valueToY: top of domain maps to 0, bottom maps to plotHeight', () => {
	expect(valueToY(150, DOMAIN, 200)).toBe(0)
	expect(valueToY(50, DOMAIN, 200)).toBe(200)
	expect(valueToY(100, DOMAIN, 200)).toBe(100)
})

test('valueToY: clamps values outside the domain', () => {
	expect(valueToY(999, DOMAIN, 200)).toBe(0)
	expect(valueToY(0, DOMAIN, 200)).toBe(200)
})

test('valueToY: zero or negative span maps to the bottom', () => {
	expect(valueToY(100, { lo: 100, hi: 100 }, 200)).toBe(200)
})

// segmentGeometry

test('segmentGeometry: full-range segment spans the plot', () => {
	const geo = segmentGeometry(50, 150, DOMAIN, 200, MIN_BODY)
	expect(geo.top).toBeCloseTo(0, 6)
	expect(geo.height).toBeCloseTo(200, 6)
})

test('segmentGeometry: single-value segment keeps the minimum body (a dot)', () => {
	const geo = segmentGeometry(100, 100, DOMAIN, 200, MIN_BODY)
	expect(geo.height).toBe(MIN_BODY)
	expect(geo.top + geo.height).toBeLessThanOrEqual(200)
	expect(geo.top).toBeGreaterThanOrEqual(0)
})

test('segmentGeometry: single value at the top of the domain stays on the plot', () => {
	// max === domain.hi forces yTop to 0; minBody must not push top negative.
	const geo = segmentGeometry(150, 150, DOMAIN, 200, MIN_BODY)
	expect(geo.top).toBe(0)
	expect(geo.height).toBe(MIN_BODY)
	expect(geo.top + geo.height).toBeLessThanOrEqual(200)
})

test('segmentGeometry: body never escapes the plot', () => {
	const cases: Array<[number, number]> = [
		[50, 60],
		[140, 150],
		[95, 105],
		[150, 150],
		[49, 49],
	]
	for (const [min, max] of cases) {
		const geo = segmentGeometry(min, max, DOMAIN, 200, MIN_BODY)
		expect(geo.top).toBeGreaterThanOrEqual(0)
		expect(geo.top + geo.height).toBeLessThanOrEqual(200 + 0.001)
		expect(geo.height).toBeGreaterThanOrEqual(MIN_BODY)
	}
})
