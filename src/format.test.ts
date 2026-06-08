import { expect, test } from 'bun:test'
import {
	formatBpm,
	formatDayLabel,
	formatRange,
	hourTickLabels,
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

// hourTickLabels

test('hourTickLabels: five evenly spaced 24-hour ticks', () => {
	expect(hourTickLabels()).toEqual(['0', '6', '12', '18', '24'])
})

// formatDayLabel

test('formatDayLabel: today, yesterday, then an explicit date', () => {
	const day = new Date(2026, 5, 7) // Jun 7
	expect(formatDayLabel(day, 0)).toBe('Today')
	expect(formatDayLabel(day, 1)).toBe('Yesterday')
	expect(formatDayLabel(day, 2)).toBe('Jun 7')
})
