import {
	DAY_HOURS,
	DEFAULT_DOMAIN_HI,
	DEFAULT_DOMAIN_LO,
	DOMAIN_PAD_RATIO,
	HOUR_MS,
	MIN_DOMAIN_PAD,
	MIN_DOMAIN_SPAN,
	SEGMENT_GAP_BPM,
} from './config'
import { formatDayLabel } from './format'

// A contiguous BPM range within an hour. An hour with a value gap (e.g. a
// resting band plus a lone spike) yields more than one segment so the spike
// renders detached rather than bridged.
export type Segment = {
	min: number
	max: number
}

// One hour's worth of heart-rate readings. `count === 0` marks an hour with no
// data (renders as a gap). `segments` carries the detached BPM bands to draw;
// `min`/`max`/`avg` are the hour's overall stats.
export type HourBucket = {
	hour: number
	min: number
	max: number
	avg: number
	count: number
	segments: Segment[]
}

export type Domain = {
	lo: number
	hi: number
}

export type DayStats = {
	min?: number
	max?: number
	avg?: number
}

// Everything one timeline entry hands to the widget for a day.
export type Entry = {
	buckets: HourBucket[]
	hasData: boolean
	restingHr?: number
	latestHr?: number
	dayOffset: number
	dayLabel: string
}

// The local-day window for the viewed day (a local-midnight epoch): start of
// that day, the query end (now for today, else that day's end), whether it is
// today, and the day count back from today (for the label and next button).
// Uses calendar arithmetic so DST-short/long days resolve correctly.
export function dayWindow(
	now: Date,
	viewedDayMs: number,
): {
	dayStart: Date
	dayStartMs: number
	endMs: number
	isToday: boolean
	offset: number
} {
	const dayStartMs = startOfDayMs(new Date(viewedDayMs))
	const dayStart = new Date(dayStartMs)

	const nextMidnight = new Date(dayStartMs)
	nextMidnight.setHours(0, 0, 0, 0)
	nextMidnight.setDate(nextMidnight.getDate() + 1)

	const endMs = Math.min(now.getTime(), nextMidnight.getTime())
	const todayMs = startOfDayMs(now)
	const offset = Math.max(0, Math.round((todayMs - dayStartMs) / 86_400_000))
	return {
		dayStart,
		dayStartMs,
		endMs,
		isToday: dayStartMs === todayMs,
		offset,
	}
}

// Local midnight of `now`, in epoch ms.
export function startOfDayMs(now: Date): number {
	const d = new Date(now.getTime())
	d.setHours(0, 0, 0, 0)
	return d.getTime()
}

// Split sorted-or-unsorted readings into contiguous BPM bands. A jump greater
// than `gap` between adjacent (sorted) values starts a new band, so an outlier
// becomes its own segment instead of stretching one tall bar.
export function clusterSegments(values: number[], gap: number): Segment[] {
	if (values.length === 0) return []
	const sorted = [...values].sort((a, b) => a - b)
	const segments: Segment[] = []
	let lo = sorted[0]!
	let hi = sorted[0]!
	for (let i = 1; i < sorted.length; i++) {
		const v = sorted[i]!
		if (v - hi > gap) {
			segments.push({ min: lo, max: hi })
			lo = v
		}
		hi = v
	}
	segments.push({ min: lo, max: hi })
	return segments
}

// Fold raw samples into 24 hourly buckets keyed by local wall-clock hour, each
// with its detached BPM segments. Samples outside the local day
// [dayStart, next local midnight) are ignored.
export function bucketSamples(
	samples: AwaitHealthQuantitySample[],
	dayStartMs: number,
): HourBucket[] {
	const perHour: number[][] = Array.from({ length: DAY_HOURS }, () => [])

	// Next local midnight via calendar arithmetic, so a daylight-saving
	// transition (a 23- or 25-hour local day) still bounds the day correctly.
	const next = new Date(dayStartMs)
	next.setHours(0, 0, 0, 0)
	next.setDate(next.getDate() + 1)
	const nextMs = next.getTime()

	for (const sample of samples) {
		const value = sample.value
		if (!Number.isFinite(value)) continue
		const t = sample.startDate.getTime()
		if (t < dayStartMs || t >= nextMs) continue
		// Key by local wall-clock hour (0..23) so candles align with the hour
		// labels even across a DST change, rather than by elapsed milliseconds.
		perHour[sample.startDate.getHours()]!.push(value)
	}

	return perHour.map((values, hour) => {
		if (values.length === 0) {
			return { hour, min: 0, max: 0, avg: 0, count: 0, segments: [] }
		}
		let min = Number.POSITIVE_INFINITY
		let max = Number.NEGATIVE_INFINITY
		let sum = 0
		for (const v of values) {
			if (v < min) min = v
			if (v > max) max = v
			sum += v
		}
		return {
			hour,
			min,
			max,
			avg: sum / values.length,
			count: values.length,
			segments: clusterSegments(values, SEGMENT_GAP_BPM),
		}
	})
}

export function hasData(buckets: HourBucket[]): boolean {
	return buckets.some((b) => b.count > 0)
}

// BPM range across the whole day, before any axis padding.
export function dayStats(buckets: HourBucket[]): DayStats {
	let min = Number.POSITIVE_INFINITY
	let max = Number.NEGATIVE_INFINITY
	let sum = 0
	let count = 0
	for (const b of buckets) {
		if (b.count === 0) continue
		if (b.min < min) min = b.min
		if (b.max > max) max = b.max
		sum += b.avg * b.count
		count += b.count
	}
	if (count === 0) return {}
	return { min, max, avg: sum / count }
}

// Padded BPM axis bounds. Falls back to a sane resting range with no data, and
// guarantees a minimum visible span so a flat day still reads as a chart.
export function computeDomain(buckets: HourBucket[]): Domain {
	const stats = dayStats(buckets)
	if (stats.min === undefined || stats.max === undefined) {
		return { lo: DEFAULT_DOMAIN_LO, hi: DEFAULT_DOMAIN_HI }
	}

	const pad = Math.max(
		MIN_DOMAIN_PAD,
		(stats.max - stats.min) * DOMAIN_PAD_RATIO,
	)
	let lo = Math.max(0, Math.floor(stats.min - pad))
	let hi = Math.ceil(stats.max + pad)
	if (hi - lo < MIN_DOMAIN_SPAN) {
		const mid = (hi + lo) / 2
		lo = Math.max(0, Math.round(mid - MIN_DOMAIN_SPAN / 2))
		hi = lo + MIN_DOMAIN_SPAN
	}
	return { lo, hi }
}

// Value of the most recent reading, used for the "current BPM" header.
export function latestFromSamples(
	samples: AwaitHealthQuantitySample[],
): number | undefined {
	let latest: number | undefined
	let latestMs = Number.NEGATIVE_INFINITY
	for (const sample of samples) {
		if (!Number.isFinite(sample.value)) continue
		const t = sample.endDate.getTime()
		if (t >= latestMs) {
			latestMs = t
			latest = sample.value
		}
	}
	return latest
}

// Synthetic but plausible day of readings: a resting overnight baseline, a
// daytime band, and one afternoon exertion spike. Only for `useSampleData`.
export function generateSampleDay(
	dayStartMs: number,
	endMs: number,
): AwaitHealthQuantitySample[] {
	const samples: AwaitHealthQuantitySample[] = []
	const lastHour = Math.min(
		DAY_HOURS - 1,
		Math.floor((endMs - dayStartMs) / HOUR_MS),
	)
	for (let hour = 0; hour <= lastHour; hour++) {
		const base = sampleBaseline(hour)
		const readings = 6 + Math.floor(Math.random() * 6)
		for (let i = 0; i < readings; i++) {
			const jitter = (Math.random() - 0.5) * 18
			const value = Math.max(42, Math.round(base + jitter))
			const offset = hour * HOUR_MS + Math.floor((i / readings) * HOUR_MS)
			const at = dayStartMs + offset
			if (at > endMs) break
			samples.push({
				value,
				startDate: new Date(at),
				endDate: new Date(at),
			})
		}
		// A lone mid-morning spike inside an otherwise calm hour, to show a
		// detached segment (the resting band plus a separate dot).
		if (hour === 8) {
			const at = dayStartMs + hour * HOUR_MS + Math.floor(HOUR_MS / 2)
			if (at <= endMs) {
				samples.push({
					value: 134,
					startDate: new Date(at),
					endDate: new Date(at),
				})
			}
		}
	}
	return samples
}

function sampleBaseline(hour: number): number {
	if (hour < 6) return 56 // overnight rest
	if (hour < 9) return 74 // morning ramp
	if (hour === 17) return 138 // afternoon workout
	if (hour < 18) return 84 // daytime
	if (hour < 22) return 78 // evening
	return 64 // wind down
}

// The only HealthKit-touching function. Pulls the chosen day's heart-rate
// series (or a synthetic one), buckets it, and resolves resting/latest. Today
// also reads the live snapshot; past days come entirely from the range query.
export async function buildEntry(
	now: Date,
	useMock: boolean,
	viewedDayMs: number,
): Promise<Entry> {
	const { dayStart, dayStartMs, endMs, isToday, offset } = dayWindow(
		now,
		viewedDayMs,
	)

	let samples: AwaitHealthQuantitySample[]
	let restingHr: number | undefined
	let latestHr: number | undefined

	if (useMock) {
		samples = generateSampleDay(dayStartMs, endMs)
		restingHr = 58
	} else {
		const range = await AwaitHealth.get({
			start: dayStart,
			end: new Date(endMs),
		})
		samples = range?.heartRate ?? []
		restingHr = latestFromSamples(range?.restingHeartRate ?? [])
		if (isToday) {
			const snapshot = await AwaitHealth.get()
			latestHr = snapshot?.heartRate
			if (restingHr === undefined) restingHr = snapshot?.restingHeartRate
		}
	}

	const buckets = bucketSamples(samples, dayStartMs)
	if (latestHr === undefined) latestHr = latestFromSamples(samples)

	return {
		buckets,
		hasData: hasData(buckets),
		restingHr,
		latestHr,
		dayOffset: offset,
		dayLabel: formatDayLabel(dayStart, offset),
	}
}
