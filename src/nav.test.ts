import { expect, test } from 'bun:test'
import { clampDay, stepDays } from './nav'

const JUN8 = new Date(2026, 5, 8, 0, 0, 0, 0).getTime()
const JUN6 = new Date(2026, 5, 6, 0, 0, 0, 0).getTime()
const JUN9 = new Date(2026, 5, 9, 0, 0, 0, 0).getTime()

// stepDays

test('stepDays: steps whole calendar days from midnight', () => {
	expect(stepDays(JUN8, -2)).toBe(JUN6)
	expect(stepDays(JUN8, 1)).toBe(JUN9)
})

test('stepDays: normalizes a mid-day epoch to midnight first', () => {
	const midday = new Date(2026, 5, 8, 13, 45, 0).getTime()
	expect(stepDays(midday, 0)).toBe(JUN8)
})

// clampDay

test('clampDay: a future day clamps to today', () => {
	expect(clampDay(JUN9, JUN8)).toBe(JUN8)
})

test('clampDay: a past day within range is kept (normalized to midnight)', () => {
	expect(clampDay(new Date(2026, 5, 6, 9, 30, 0).getTime(), JUN8)).toBe(JUN6)
})

test('clampDay: a non-finite day falls back to today', () => {
	expect(clampDay(Number.NaN, JUN8)).toBe(JUN8)
})

test('clampDay: an absurdly old day is floored, still in the past', () => {
	const floored = clampDay(0, JUN8)
	expect(floored).toBeLessThan(JUN8)
	expect(Number.isFinite(floored)).toBe(true)
})
