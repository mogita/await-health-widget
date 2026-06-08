import { expect, test } from 'bun:test'
import { clampOffset } from './nav'

test('clampOffset: today and earlier clamp to 0', () => {
	expect(clampOffset(0)).toBe(0)
	expect(clampOffset(-5)).toBe(0)
})

test('clampOffset: non-finite values clamp to 0', () => {
	expect(clampOffset(Number.NaN)).toBe(0)
	expect(clampOffset(Number.POSITIVE_INFINITY)).toBe(0)
})

test('clampOffset: fractional offsets floor to whole days', () => {
	expect(clampOffset(3.9)).toBe(3)
})

test('clampOffset: caps runaway offsets', () => {
	const capped = clampOffset(1_000_000)
	expect(capped).toBeLessThan(1_000_000)
	expect(Number.isFinite(capped)).toBe(true)
	expect(capped).toBeGreaterThan(0)
})
