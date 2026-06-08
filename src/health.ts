import {
	DAY_HOURS,
	DEFAULT_DOMAIN_HI,
	DEFAULT_DOMAIN_LO,
	DOMAIN_PAD_RATIO,
	HOUR_MS,
	MIN_DOMAIN_PAD,
	MIN_DOMAIN_SPAN,
} from './config'

// One hour's worth of heart-rate readings, reduced to the values a candle
// needs. `count === 0` marks an hour with no data (renders as a gap).
export type HourBucket = {
	hour: number
	min: number
	max: number
	avg: number
	count: number
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
}

// Local midnight of `now`, in epoch ms.
export function startOfDayMs(now: Date): number {
	const d = new Date(now.getTime())
	d.setHours(0, 0, 0, 0)
	return d.getTime()
}

// Fold raw samples into 24 hourly buckets keyed by local wall-clock hour.
// Samples outside the local day [dayStart, next local midnight) are ignored.
export function bucketSamples(
	samples: AwaitHealthQuantitySample[],
	dayStartMs: number,
): HourBucket[] {
	const acc = Array.from({ length: DAY_HOURS }, (_unused, hour) => ({
		hour,
		min: Number.POSITIVE_INFINITY,
		max: Number.NEGATIVE_INFINITY,
		sum: 0,
		count: 0,
	}))

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
		const bucket = acc[sample.startDate.getHours()]!
		if (value < bucket.min) bucket.min = value
		if (value > bucket.max) bucket.max = value
		bucket.sum += value
		bucket.count += 1
	}

	return acc.map((b) =>
		b.count === 0
			? { hour: b.hour, min: 0, max: 0, avg: 0, count: 0 }
			: {
					hour: b.hour,
					min: b.min,
					max: b.max,
					avg: b.sum / b.count,
					count: b.count,
				},
	)
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
	nowMs: number,
): AwaitHealthQuantitySample[] {
	const samples: AwaitHealthQuantitySample[] = []
	const lastHour = Math.min(
		DAY_HOURS - 1,
		Math.floor((nowMs - dayStartMs) / HOUR_MS),
	)
	for (let hour = 0; hour <= lastHour; hour++) {
		const base = sampleBaseline(hour)
		const readings = 6 + Math.floor(Math.random() * 6)
		for (let i = 0; i < readings; i++) {
			const jitter = (Math.random() - 0.5) * 18
			const value = Math.max(42, Math.round(base + jitter))
			const offset = hour * HOUR_MS + Math.floor((i / readings) * HOUR_MS)
			const at = dayStartMs + offset
			if (at > nowMs) break
			samples.push({
				value,
				startDate: new Date(at),
				endDate: new Date(at),
			})
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

// The only HealthKit-touching function. Pulls the day's heart-rate series (or
// a synthetic one), buckets it, and reads resting/latest from the snapshot.
export async function buildEntry(now: Date, useMock: boolean): Promise<Entry> {
	const dayStartMs = startOfDayMs(now)
	const nowMs = now.getTime()

	let samples: AwaitHealthQuantitySample[]
	let restingHr: number | undefined
	let latestHr: number | undefined

	if (useMock) {
		samples = generateSampleDay(dayStartMs, nowMs)
		restingHr = 58
	} else {
		// Independent calls: fetch the day's series and the snapshot in parallel.
		const [range, snapshot] = await Promise.all([
			AwaitHealth.get({ start: new Date(dayStartMs), end: now }),
			AwaitHealth.get(),
		])
		samples = range?.heartRate ?? []
		restingHr = snapshot?.restingHeartRate
		latestHr = snapshot?.heartRate
	}

	const buckets = bucketSamples(samples, dayStartMs)
	if (latestHr === undefined) latestHr = latestFromSamples(samples)

	return {
		buckets,
		hasData: hasData(buckets),
		restingHr,
		latestHr,
	}
}
