import { expect, test } from 'bun:test'
import { MIN_BODY } from './config'
import type { Domain, HourBucket } from './health'
import {
	candleGeometry,
	classifyFamily,
	computeLayout,
	valueToY,
} from './layout'

const DOMAIN: Domain = { lo: 50, hi: 150 }

function bucket(min: number, max: number, count = 3): HourBucket {
	return { hour: 0, min, max, avg: (min + max) / 2, count }
}

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

test('computeLayout: fits 24 bars within the plot width', () => {
	const layout = computeLayout({ width: 360, height: 340 }, 'system')
	const used = layout.barWidth * 24 + layout.gap * 23
	expect(used).toBeLessThanOrEqual(layout.plotWidth + 0.001)
	expect(layout.barWidth).toBeGreaterThan(0)
	expect(layout.plotHeight).toBeGreaterThan(0)
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

// candleGeometry

test('candleGeometry: full-range hour spans the plot', () => {
	const geo = candleGeometry(bucket(50, 150), DOMAIN, 200)
	expect(geo.top).toBeCloseTo(0, 6)
	expect(geo.height).toBeCloseTo(200, 6)
})

test('candleGeometry: single-value hour keeps a minimum visible body', () => {
	const geo = candleGeometry(bucket(100, 100), DOMAIN, 200)
	expect(geo.height).toBe(MIN_BODY)
	expect(geo.top + geo.height).toBeLessThanOrEqual(200)
	expect(geo.top).toBeGreaterThanOrEqual(0)
})

test('candleGeometry: single value at the top of the domain stays on the plot', () => {
	// max === domain.hi forces yTop to 0; MIN_BODY must not push top negative.
	const geo = candleGeometry(bucket(150, 150), DOMAIN, 200)
	expect(geo.top).toBe(0)
	expect(geo.height).toBe(MIN_BODY)
	expect(geo.top + geo.height).toBeLessThanOrEqual(200)
})

test('candleGeometry: body never escapes the plot', () => {
	for (const b of [
		bucket(50, 60),
		bucket(140, 150),
		bucket(95, 105),
		bucket(150, 150),
		bucket(49, 49),
	]) {
		const geo = candleGeometry(b, DOMAIN, 200)
		expect(geo.top).toBeGreaterThanOrEqual(0)
		expect(geo.top + geo.height).toBeLessThanOrEqual(200 + 0.001)
		expect(geo.height).toBeGreaterThanOrEqual(MIN_BODY)
	}
})
