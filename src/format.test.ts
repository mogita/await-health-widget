import { expect, test } from 'bun:test'
import {
	formatAgo,
	formatBpm,
	formatDayLabel,
	formatHourTick,
	formatRange,
} from './format'

// formatBpm

test('formatBpm: rounds a value', () => {
	expect(formatBpm(72.4)).toBe('72')
	expect(formatBpm(72.6)).toBe('73')
})

test('formatBpm: undefined and non-finite render as --', () => {
	expect(formatBpm(undefined)).toBe('--')
	expect(formatBpm(Number.NaN)).toBe('--')
	expect(formatBpm(Number.POSITIVE_INFINITY)).toBe('--')
})

// formatRange

test('formatRange: renders rounded low-high', () => {
	expect(formatRange(57.6, 142.2)).toBe('58-142')
})

test('formatRange: missing bound renders --', () => {
	expect(formatRange(undefined, 120)).toBe('--')
	expect(formatRange(60, undefined)).toBe('--')
})

// formatHourTick / formatClock

test('formatHourTick: zero-pads the hour', () => {
	expect(formatHourTick(0)).toBe('00')
	expect(formatHourTick(6)).toBe('06')
	expect(formatHourTick(18)).toBe('18')
})

test('formatAgo: minute granularity, never seconds', () => {
	expect(formatAgo(30_000)).toBe('just now')
	expect(formatAgo(60_000)).toBe('1 min ago')
	expect(formatAgo(12 * 60_000 + 45_000)).toBe('12 min ago')
	expect(formatAgo(90 * 60_000)).toBe('1 hr ago')
})

// formatDayLabel

test('formatDayLabel: today, yesterday, then an explicit date', () => {
	const day = new Date(2026, 5, 7) // Jun 7
	expect(formatDayLabel(day, 0)).toBe('Today')
	expect(formatDayLabel(day, 1)).toBe('Yesterday')
	expect(formatDayLabel(day, 2)).toBe('Jun 7')
})
