// Which day the widget is showing, stored in AwaitStore as the viewed day's
// local-midnight epoch (absolute, not a relative offset) so a parked day stays
// on that calendar date across midnight. Paged by the prev/next intents.
const VIEWED_DAY_KEY = 'viewedDayMs'

// Floor only, to stop runaway paging; the prev button is never hidden.
const MAX_DAYS_BACK = 3650

// Local midnight of an epoch.
function midnight(ms: number): number {
	const d = new Date(ms)
	d.setHours(0, 0, 0, 0)
	return d.getTime()
}

// Add `delta` calendar days to a day (DST-safe: steps wall-clock days, not ms).
export function stepDays(dayMs: number, delta: number): number {
	const d = new Date(dayMs)
	d.setHours(0, 0, 0, 0)
	d.setDate(d.getDate() + delta)
	return d.getTime()
}

// Normalize a candidate day to local midnight, clamped to [today - MAX, today]:
// never the future, never absurdly far back. Falls back to today if invalid.
export function clampDay(dayMs: number, todayMs: number): number {
	const today = midnight(todayMs)
	if (!Number.isFinite(dayMs)) return today
	const day = midnight(dayMs)
	if (day > today) return today
	const floor = stepDays(today, -MAX_DAYS_BACK)
	return day < floor ? floor : day
}

export function readViewedDay(now: Date): number {
	const today = midnight(now.getTime())
	return clampDay(AwaitStore.num(VIEWED_DAY_KEY, today), today)
}

// Intent: page one calendar day older.
export function prevDay(): void {
	const now = new Date()
	const today = midnight(now.getTime())
	AwaitStore.set(
		VIEWED_DAY_KEY,
		clampDay(stepDays(readViewedDay(now), -1), today),
	)
}

// Intent: page one calendar day newer (clamped at today).
export function nextDay(): void {
	const now = new Date()
	const today = midnight(now.getTime())
	AwaitStore.set(
		VIEWED_DAY_KEY,
		clampDay(stepDays(readViewedDay(now), 1), today),
	)
}

// Intent: jump straight back to today (tapping the day label).
export function today(): void {
	AwaitStore.set(VIEWED_DAY_KEY, midnight(new Date().getTime()))
}
