import { DAY_HOURS } from './config'
import type { Domain } from './health'

// How a widget family maps to a rendering mode:
// - system: full chart with optional header + hour axis (small..extraLarge).
// - compact: bars only, no chrome (lock-screen rectangular / circular).
// - inline: a single text line (accessoryInline cannot draw shapes).
export type ChartKind = 'system' | 'compact' | 'inline'

export type ChartLayout = {
	padding: number
	padTop: number
	padBottom: number
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
	showFooter: boolean
}

// Chrome sizes, in points.
const HEADER_H = 28 // heart | two compact stat rows
const AXIS_H = 12
const AXIS_GAP = 2
const Y_LABEL_W = 16 // snug for a 3-digit BPM at 8pt; keeps the left tight
const HGAP = 2
// Hosts the prev/next tap targets and a 2-line center (day label + freshness).
const FOOTER_H = 24
// Top/bottom insets: tighter than the sides so the stats and footer sit close
// to their borders.
const PAD_TOP = 8
const PAD_BOTTOM = 8

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
	const padding = kind === 'system' ? 10 : kind === 'compact' ? 4 : 0
	const padTop = kind === 'system' ? PAD_TOP : padding
	const padBottom = kind === 'system' ? PAD_BOTTOM : padding
	const spacing = kind === 'system' ? 6 : 0
	const innerW = Math.max(1, size.width - padding * 2)
	const innerH = Math.max(1, size.height - padTop - padBottom)

	const showHeader = kind === 'system' && innerH >= 116
	const showAxis = kind === 'system' && innerH >= 88
	// The prev/next footer is the paging control; show it whenever a system
	// widget has any reasonable height.
	const showFooter = kind === 'system' && innerH >= 96
	// Show the y-axis on every system family, including small; only skip it on a
	// degenerately narrow box where the label strip would crowd out the bars.
	const showYAxis = kind === 'system' && innerW >= 110

	const headerH = showHeader ? HEADER_H : 0
	const axisH = showAxis ? AXIS_H : 0
	const footerH = showFooter ? FOOTER_H : 0
	const topGap = showHeader ? spacing : 0
	const footerGap = showFooter ? spacing : 0
	const axisGap = showAxis ? AXIS_GAP : 0
	const hgap = showYAxis ? HGAP : 0
	const yLabelWidth = showYAxis ? Y_LABEL_W : 0

	// Subtract every gap and reserved strip so the plot fits exactly. Vertical:
	// header + topGap + chart + axisGap + axis + footerGap + footer = innerH.
	// Horizontal: the y-label column and its gap sit to the right of the plot.
	const plotHeight = Math.max(
		1,
		innerH - headerH - topGap - axisH - axisGap - footerGap - footerH,
	)
	const plotWidth = Math.max(1, innerW - yLabelWidth - hgap)

	// Equal-width slot per hour; the capsule is a thin, capped fraction of it,
	// centered, so bars never look fat on wide widgets.
	const slot = plotWidth / DAY_HOURS
	const barWidth = Math.max(BAR_MIN, Math.min(slot * BAR_FRACTION, BAR_MAX))

	return {
		padding,
		padTop,
		padBottom,
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
		showFooter,
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
