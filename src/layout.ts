import { DAY_HOURS } from './config'
import type { Domain } from './health'

// How a widget family maps to a rendering mode:
// - system: full chart with optional header + hour axis (small..extraLarge).
// - compact: bars only, no chrome (lock-screen rectangular / circular).
// - inline: a single text line (accessoryInline cannot draw shapes).
export type ChartKind = 'system' | 'compact' | 'inline'

export type ChartLayout = {
	padding: number
	spacing: number
	axisGap: number
	hgap: number
	plotWidth: number
	plotHeight: number
	slot: number
	barWidth: number
	yLabelWidth: number
	showHeader: boolean
	showAxis: boolean
	showYAxis: boolean
}

// Chrome sizes, in points.
const HEADER_H = 22
const AXIS_H = 14
const AXIS_GAP = 2
const Y_LABEL_W = 22
const HGAP = 4

// Each hour gets an equal-width slot; the capsule fills this fraction of it,
// the rest is breathing room. Capped so wide widgets stay thin, not fat.
const BAR_FRACTION = 0.5
const BAR_MIN = 1.5
const BAR_MAX = 7

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
	// Show the y-axis on every system family, including small; only skip it on a
	// degenerately narrow box where the label strip would crowd out the bars.
	const showYAxis = kind === 'system' && innerW >= 110

	const headerH = showHeader ? HEADER_H : 0
	const axisH = showAxis ? AXIS_H : 0
	const topGap = showHeader ? spacing : 0
	const axisGap = showAxis ? AXIS_GAP : 0
	const hgap = showYAxis ? HGAP : 0
	const yLabelWidth = showYAxis ? Y_LABEL_W : 0

	// Subtract every gap and reserved strip so the plot fits exactly. Vertical:
	// header + topGap + chart + axisGap + axis = innerH. Horizontal: the y-label
	// column and its gap sit to the right of the plot.
	const plotHeight = Math.max(1, innerH - headerH - topGap - axisH - axisGap)
	const plotWidth = Math.max(1, innerW - yLabelWidth - hgap)

	// Equal-width slot per hour; the capsule is a thin, capped fraction of it,
	// centered, so bars never look fat on wide widgets.
	const slot = plotWidth / DAY_HOURS
	const barWidth = Math.max(BAR_MIN, Math.min(slot * BAR_FRACTION, BAR_MAX))

	return {
		padding,
		spacing,
		axisGap,
		hgap,
		plotWidth,
		plotHeight,
		slot,
		barWidth,
		yLabelWidth,
		showHeader,
		showAxis,
		showYAxis,
	}
}

// 3-5 round BPM stops within the domain for the y-axis labels and gridlines.
export function bpmTicks(domain: Domain): number[] {
	const span = domain.hi - domain.lo
	const step = span <= 30 ? 10 : span <= 60 ? 20 : span <= 120 ? 25 : 50
	const start = Math.ceil(domain.lo / step) * step
	const ticks: number[] = []
	for (let v = start; v <= domain.hi; v += step) ticks.push(v)
	return ticks
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

// One segment's body: top offset and height within the plot, clamped to the
// plot and to `minBody` so a single-reading band stays visible (as a dot).
export function segmentGeometry(
	min: number,
	max: number,
	domain: Domain,
	plotHeight: number,
	minBody: number,
): { top: number; height: number } {
	const yTop = valueToY(max, domain, plotHeight)
	const yBottom = valueToY(min, domain, plotHeight)
	const height = Math.min(plotHeight, Math.max(minBody, yBottom - yTop))
	const top = Math.max(0, Math.min(yTop, plotHeight - height))
	return { top, height }
}
