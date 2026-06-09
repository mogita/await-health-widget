import { expect, test } from 'bun:test'
import { HOUR_MS, SEGMENT_GAP_BPM } from './config'
import {
	bucketSamples,
	clusterSegments,
	computeDomain,
	dayStats,
	dayWindow,
	generateSampleDay,
	type HourBucket,
	latestFromSamples,
	latestSample,
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

// dayWindow

test('dayWindow: today spans local midnight to now, offset 0', () => {
	const now = new Date(2026, 5, 8, 14, 30, 0)
	const today = new Date(2026, 5, 8, 0, 0, 0, 0).getTime()
	const w = dayWindow(now, today)
	expect(w.isToday).toBe(true)
	expect(w.offset).toBe(0)
	expect(w.dayStartMs).toBe(today)
	expect(w.endMs).toBe(now.getTime())
})

test('dayWindow: a past day spans its full midnight to next midnight, offset derived', () => {
	const now = new Date(2026, 5, 8, 14, 30, 0)
	const jun6 = new Date(2026, 5, 6, 0, 0, 0, 0).getTime()
	const w = dayWindow(now, jun6)
	expect(w.isToday).toBe(false)
	expect(w.offset).toBe(2)
	expect(w.dayStartMs).toBe(jun6)
	expect(w.endMs).toBe(new Date(2026, 5, 7, 0, 0, 0, 0).getTime())
})

test('dayWindow: a mid-day viewed epoch is normalized to that midnight', () => {
	const now = new Date(2026, 5, 8, 14, 30, 0)
	const viewed = new Date(2026, 5, 7, 11, 0, 0).getTime()
	const w = dayWindow(now, viewed)
	expect(w.dayStartMs).toBe(new Date(2026, 5, 7, 0, 0, 0, 0).getTime())
	expect(w.offset).toBe(1)
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
	expect(nine).toEqual({
		hour: 9,
		min: 70,
		max: 90,
		avg: 80,
		count: 3,
		segments: [{ min: 70, max: 90 }],
	})
})

test('bucketSamples: empty hours have count 0 and no segments', () => {
	const buckets = bucketSamples([sample(9, 0, 70)], DAY_START)
	expect(buckets[0]).toEqual({
		hour: 0,
		min: 0,
		max: 0,
		avg: 0,
		count: 0,
		segments: [],
	})
	expect(buckets[10]!.count).toBe(0)
})

test('bucketSamples: an in-hour outlier splits into a detached segment', () => {
	// 60/70/80 cluster + a lone 130 -> two segments, not one 60-130 bar.
	const buckets = bucketSamples(
		[
			sample(9, 5, 60),
			sample(9, 15, 80),
			sample(9, 25, 130),
			sample(9, 35, 70),
		],
		DAY_START,
	)
	const nine = buckets[9]!
	expect(nine.min).toBe(60)
	expect(nine.max).toBe(130)
	expect(nine.segments).toEqual([
		{ min: 60, max: 80 },
		{ min: 130, max: 130 },
	])
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
	expect(buckets[5]).toEqual({
		hour: 5,
		min: 60,
		max: 60,
		avg: 60,
		count: 1,
		segments: [{ min: 60, max: 60 }],
	})
})

// clusterSegments

test('clusterSegments: contiguous readings stay one segment', () => {
	expect(clusterSegments([60, 65, 70, 80], SEGMENT_GAP_BPM)).toEqual([
		{ min: 60, max: 80 },
	])
})

test('clusterSegments: a gap larger than the threshold splits, order-independent', () => {
	expect(clusterSegments([80, 60, 130, 70], SEGMENT_GAP_BPM)).toEqual([
		{ min: 60, max: 80 },
		{ min: 130, max: 130 },
	])
})

test('clusterSegments: multiple gaps yield multiple segments', () => {
	expect(clusterSegments([50, 52, 90, 92, 150], 25)).toEqual([
		{ min: 50, max: 52 },
		{ min: 90, max: 92 },
		{ min: 150, max: 150 },
	])
})

test('clusterSegments: empty input yields no segments', () => {
	expect(clusterSegments([], SEGMENT_GAP_BPM)).toEqual([])
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

test('computeDomain: floors/ceils tight to the day min and max', () => {
	const buckets = bucketSamples([sample(9, 0, 70), sample(9, 1, 90)], DAY_START)
	expect(computeDomain(buckets)).toEqual({ lo: 70, hi: 90 })
})

test('computeDomain: enforces a minimum span for a flat day', () => {
	const buckets = bucketSamples([sample(9, 0, 60), sample(9, 1, 60)], DAY_START)
	const domain = computeDomain(buckets)
	expect(domain.hi - domain.lo).toBeGreaterThanOrEqual(16)
	expect(domain).toEqual({ lo: 52, hi: 68 })
})

test('computeDomain: low value clamps lo to 0 and still keeps the min span', () => {
	const buckets = bucketSamples([sample(0, 0, 5)], DAY_START)
	const domain = computeDomain(buckets)
	expect(domain).toEqual({ lo: 0, hi: 16 })
	expect(domain.hi - domain.lo).toBe(16)
})

test('computeDomain: a resting HR below the day min widens the low bound', () => {
	const buckets = bucketSamples([sample(9, 0, 70), sample(9, 1, 90)], DAY_START)
	// Without resting the floor is 70; resting 55 pulls it down to 55.
	expect(computeDomain(buckets, 55)).toEqual({ lo: 55, hi: 90 })
	// A resting HR above the day min does not raise the floor.
	expect(computeDomain(buckets, 80)).toEqual({ lo: 70, hi: 90 })
})

// latestSample / latestFromSamples

test('latestSample: returns the value and timestamp of the most recent reading', () => {
	const s = sample(15, 30, 120)
	const got = latestSample([sample(8, 0, 70), s, sample(10, 0, 95)])
	expect(got).toEqual({ value: 120, atMs: s.endDate.getTime() })
})

test('latestSample: undefined when there is nothing finite', () => {
	expect(latestSample([])).toBeUndefined()
})

test('latestFromSamples: returns value of the most recent reading', () => {
	const samples = [sample(8, 0, 70), sample(15, 30, 120), sample(10, 0, 95)]
	expect(latestFromSamples(samples)).toBe(120)
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
