import { expect, test } from 'bun:test'
import { HOUR_MS } from './config'
import {
	bucketSamples,
	computeDomain,
	dayStats,
	generateSampleDay,
	type HourBucket,
	latestFromSamples,
	startOfDayMs,
} from './health'

const DAY_START = new Date(2026, 5, 8, 0, 0, 0, 0).getTime()

function sample(hour: number, minute: number, value: number) {
	const at = DAY_START + hour * HOUR_MS + minute * 60_000
	return { value, startDate: new Date(at), endDate: new Date(at) }
}

// startOfDayMs

test('startOfDayMs: returns local midnight of the given date', () => {
	const noon = new Date(2026, 5, 8, 12, 34, 56, 789)
	expect(startOfDayMs(noon)).toBe(DAY_START)
})

// bucketSamples

test('bucketSamples: always returns 24 buckets', () => {
	expect(bucketSamples([], DAY_START)).toHaveLength(24)
})

test('bucketSamples: folds readings into the right hour with min/max/avg', () => {
	const buckets = bucketSamples(
		[sample(9, 5, 70), sample(9, 20, 90), sample(9, 50, 80)],
		DAY_START,
	)
	const nine = buckets[9]!
	expect(nine).toEqual({ hour: 9, min: 70, max: 90, avg: 80, count: 3 })
})

test('bucketSamples: empty hours have count 0', () => {
	const buckets = bucketSamples([sample(9, 0, 70)], DAY_START)
	expect(buckets[0]).toEqual({ hour: 0, min: 0, max: 0, avg: 0, count: 0 })
	expect(buckets[10]!.count).toBe(0)
})

test('bucketSamples: drops samples outside the day window', () => {
	const before = {
		value: 80,
		startDate: new Date(DAY_START - 60_000),
		endDate: new Date(DAY_START - 60_000),
	}
	const after = sample(24, 0, 80) // index 24, out of range
	const buckets = bucketSamples([before, after, sample(3, 0, 55)], DAY_START)
	expect(buckets.reduce((n, b) => n + b.count, 0)).toBe(1)
	expect(buckets[3]!.count).toBe(1)
})

test('bucketSamples: ignores non-finite values', () => {
	const buckets = bucketSamples(
		[sample(5, 0, Number.NaN), sample(5, 1, 60)],
		DAY_START,
	)
	expect(buckets[5]).toEqual({ hour: 5, min: 60, max: 60, avg: 60, count: 1 })
})

// dayStats

test('dayStats: empty buckets yield no stats', () => {
	expect(dayStats(bucketSamples([], DAY_START))).toEqual({})
})

test('dayStats: weighted average across hours', () => {
	const buckets = bucketSamples(
		[sample(9, 0, 70), sample(9, 10, 90), sample(10, 0, 100)],
		DAY_START,
	)
	const stats = dayStats(buckets)
	expect(stats.min).toBe(70)
	expect(stats.max).toBe(100)
	// (80*2 + 100*1) / 3
	expect(stats.avg).toBeCloseTo(260 / 3, 6)
})

// computeDomain

test('computeDomain: no data falls back to the default resting range', () => {
	expect(computeDomain(bucketSamples([], DAY_START))).toEqual({
		lo: 40,
		hi: 140,
	})
})

test('computeDomain: pads around the data range', () => {
	const buckets = bucketSamples([sample(9, 0, 70), sample(9, 1, 90)], DAY_START)
	expect(computeDomain(buckets)).toEqual({ lo: 64, hi: 96 })
})

test('computeDomain: enforces a minimum span for a flat day', () => {
	const buckets = bucketSamples([sample(9, 0, 60), sample(9, 1, 60)], DAY_START)
	const domain = computeDomain(buckets)
	expect(domain.hi - domain.lo).toBeGreaterThanOrEqual(24)
	expect(domain).toEqual({ lo: 48, hi: 72 })
})

test('computeDomain: low value clamps lo to 0 and still keeps the min span', () => {
	const buckets = bucketSamples([sample(0, 0, 5)], DAY_START)
	const domain = computeDomain(buckets)
	expect(domain).toEqual({ lo: 0, hi: 24 })
	expect(domain.hi - domain.lo).toBe(24)
})

// latestFromSamples

test('latestFromSamples: returns value of the most recent reading', () => {
	const samples = [sample(8, 0, 70), sample(15, 30, 120), sample(10, 0, 95)]
	expect(latestFromSamples(samples)).toBe(120)
})

test('latestFromSamples: undefined when there is nothing finite', () => {
	expect(latestFromSamples([])).toBeUndefined()
})

// generateSampleDay

test('generateSampleDay: stays within [dayStart, now] and the elapsed hours', () => {
	const now = DAY_START + 9 * HOUR_MS + 30 * 60_000
	const samples = generateSampleDay(DAY_START, now)
	expect(samples.length).toBeGreaterThan(0)
	for (const s of samples) {
		expect(s.startDate.getTime()).toBeGreaterThanOrEqual(DAY_START)
		expect(s.startDate.getTime()).toBeLessThanOrEqual(now)
		expect(s.value).toBeGreaterThan(0)
	}
	const buckets: HourBucket[] = bucketSamples(samples, DAY_START)
	// No data should land past the current hour.
	for (let hour = 10; hour < 24; hour++) {
		expect(buckets[hour]!.count).toBe(0)
	}
})
