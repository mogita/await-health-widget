// Round a BPM value for display, or '--' when there is nothing to show.
export function formatBpm(value?: number): string {
	return value === undefined || !Number.isFinite(value)
		? '--'
		: `${Math.round(value)}`
}

// Compact "low-high" range, e.g. "58-142". '--' when either bound is missing.
export function formatRange(min?: number, max?: number): string {
	if (
		min === undefined ||
		max === undefined ||
		!Number.isFinite(min) ||
		!Number.isFinite(max)
	) {
		return '--'
	}
	return `${Math.round(min)}-${Math.round(max)}`
}

// Hours labeled under the chart, aligned to the 0/6/12/18 gridlines.
export const HOUR_TICKS = [0, 6, 12, 18]

function pad2(n: number): string {
	return n < 10 ? `0${n}` : `${n}`
}

// Elapsed time at minute granularity (no seconds): "just now" / "N min ago" /
// "N hr ago". Recomputed each refresh; never churns at second resolution.
export function formatAgo(deltaMs: number): string {
	const minutes = Math.floor(deltaMs / 60_000)
	if (minutes < 1) return 'just now'
	if (minutes < 60) return `${minutes} min ago`
	return `${Math.floor(minutes / 60)} hr ago`
}

// Two-digit hour label, e.g. 6 -> "06".
export function formatHourTick(hour: number): string {
	return pad2(hour)
}

const MONTHS = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec',
]

// Label for the day being viewed: Today / Yesterday / "Jun 7".
export function formatDayLabel(day: Date, offset: number): string {
	if (offset <= 0) return 'Today'
	if (offset === 1) return 'Yesterday'
	return `${MONTHS[day.getMonth()]} ${day.getDate()}`
}
