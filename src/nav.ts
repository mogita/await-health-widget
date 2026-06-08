// Which day the widget is showing, as a day offset stored in AwaitStore.
// 0 = today; larger = further back. Paged by the prev/next widget intents.
const DAY_OFFSET_KEY = 'dayOffset'

// Upper bound only to stop runaway paging; the prev button is never hidden, so
// this is effectively "as far back as data exists".
const MAX_DAY_OFFSET = 3650

// Normalize any stored/derived offset to a whole number in [0, MAX_DAY_OFFSET].
export function clampOffset(offset: number): number {
	if (!Number.isFinite(offset) || offset < 0) return 0
	return Math.min(MAX_DAY_OFFSET, Math.floor(offset))
}

export function readDayOffset(): number {
	return clampOffset(AwaitStore.num(DAY_OFFSET_KEY, 0))
}

// Intent: page one day older.
export function prevDay(): void {
	AwaitStore.set(DAY_OFFSET_KEY, clampOffset(readDayOffset() + 1))
}

// Intent: page one day newer (clamped at today).
export function nextDay(): void {
	AwaitStore.set(DAY_OFFSET_KEY, clampOffset(readDayOffset() - 1))
}
