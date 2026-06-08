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

// 24-hour ticks shown under the chart at the 0/6/12/18/24 boundaries, evenly
// spaced so labels never crowd.
export function hourTickLabels(): string[] {
	return ['0', '6', '12', '18', '24']
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
