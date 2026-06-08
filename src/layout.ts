import { DAY_HOURS, MIN_BODY } from './config'
import type { Domain, HourBucket } from './health'

// How a widget family maps to a rendering mode:
// - system: full chart with optional header + hour axis (small..extraLarge).
// - compact: bars only, no chrome (lock-screen rectangular / circular).
// - inline: a single text line (accessoryInline cannot draw shapes).
export type ChartKind = 'system' | 'compact' | 'inline'

export type ChartLayout = {
	padding: number
	spacing: number
	plotWidth: number
	plotHeight: number
	barWidth: number
	gap: number
	showHeader: boolean
	showAxis: boolean
}

export function classifyFamily(family: WidgetFamily): ChartKind {
	if (family === 'accessoryInline') return 'inline'
	if (family === 'accessoryCircular' || family === 'accessoryRectangular') {
		return 'compact'
	}
	return 'system'
}

// Derive a chart layout from the widget's pixel size. The bar count is always
// 24 (one per hour); bars thin down to fit rather than dropping hours.
export function computeLayout(size: Size, kind: ChartKind): ChartLayout {
	const padding = kind === 'system' ? 12 : kind === 'compact' ? 4 : 0
	const spacing = kind === 'system' ? 6 : 0
	const innerW = Math.max(1, size.width - padding * 2)
	const innerH = Math.max(1, size.height - padding * 2)

	const showHeader = kind === 'system' && innerH >= 116
	const showAxis = kind === 'system' && innerH >= 88
	const headerH = showHeader ? 22 : 0
	const axisH = showAxis ? 14 : 0

	// The column holds header + chart + axis stacked with `spacing` between each
	// visible pair; subtract those gaps so the plot fits exactly, not overflows.
	const gaps = (showHeader ? 1 : 0) + (showAxis ? 1 : 0)
	const plotWidth = innerW
	const plotHeight = Math.max(1, innerH - headerH - axisH - spacing * gaps)

	const gap = innerW >= 240 ? 3 : innerW >= 140 ? 2 : 1
	const barWidth = Math.max(
		0.5,
		(plotWidth - gap * (DAY_HOURS - 1)) / DAY_HOURS,
	)

	return {
		padding,
		spacing,
		plotWidth,
		plotHeight,
		barWidth,
		gap,
		showHeader,
		showAxis,
	}
}

// Map a BPM value to a y-offset from the top of the plot (0 = top = high BPM).
export function valueToY(
	value: number,
	domain: Domain,
	plotHeight: number,
): number {
	const span = domain.hi - domain.lo
	if (span <= 0) return plotHeight
	const t = Math.max(0, Math.min(1, (value - domain.lo) / span))
	return plotHeight * (1 - t)
}

// Candle body for one hour: top offset and height, clamped to the plot and to
// a minimum thickness so single-reading hours stay visible.
export function candleGeometry(
	bucket: HourBucket,
	domain: Domain,
	plotHeight: number,
): { top: number; height: number } {
	const yTop = valueToY(bucket.max, domain, plotHeight)
	const yBottom = valueToY(bucket.min, domain, plotHeight)
	const height = Math.min(plotHeight, Math.max(MIN_BODY, yBottom - yTop))
	const top = Math.max(0, Math.min(yTop, plotHeight - height))
	return { top, height }
}
