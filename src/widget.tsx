import {
	Button,
	Capsule,
	Color,
	HStack,
	Icon,
	Rectangle,
	Spacer,
	Text,
	VStack,
	ZStack,
} from 'await'
import {
	AXIS_COLOR,
	BACKGROUND,
	GRID_COLOR,
	MIN_BODY,
	zoneColor,
} from './config'
import { formatBpm, formatRange, hourTickLabels } from './format'
import {
	computeDomain,
	type DayStats,
	type Domain,
	dayStats,
	type Entry,
	type HourBucket,
	type Segment,
} from './health'
import {
	bpmTicks,
	type ChartKind,
	type ChartLayout,
	classifyFamily,
	computeLayout,
	segmentGeometry,
	valueToY,
} from './layout'
import { accentColor, colorByZone, showRestingLine } from './panels'

export function widget(
	entry: WidgetEntry<Entry> & {
		prevIntent: IntentInfo
		nextIntent: IntentInfo
	},
): NativeView {
	const kind = classifyFamily(entry.family)
	const stats = dayStats(entry.buckets)

	if (kind === 'inline') return inlineView(entry, stats)

	const layout = computeLayout(entry.size, kind)
	const body = entry.hasData ? dayChart(entry, layout) : emptyChart(kind)

	if (kind === 'compact') {
		return (
			<ZStack alignment='topLeading' maxSides>
				<VStack
					padding={layout.padding}
					frame={{ maxWidth: 'max', maxHeight: 'max', alignment: 'topLeading' }}
				>
					{body}
				</VStack>
			</ZStack>
		)
	}

	return (
		<ZStack alignment='topLeading' maxSides>
			<Color value={BACKGROUND} />
			<VStack
				alignment='leading'
				spacing={layout.spacing}
				padding={layout.padding}
				frame={{ maxWidth: 'max', maxHeight: 'max', alignment: 'topLeading' }}
			>
				{layout.showHeader ? headerView(entry) : undefined}
				{body}
				{layout.showFooter
					? footerView(entry, entry.prevIntent, entry.nextIntent)
					: undefined}
			</VStack>
		</ZStack>
	)
}

// The plot area (chart + y-axis labels + x-axis). Fills the leftover height
// (maxHeight) with the chart pinned to the top, so any reserved-constant slack
// is absorbed here and the footer stays flush to the bottom — matching the
// empty-day placeholder so both states pin the footer identically.
function dayChart(entry: Entry, layout: ChartLayout): NativeView {
	const domain = computeDomain(entry.buckets)
	return (
		<HStack
			spacing={layout.hgap}
			alignment='top'
			frame={{ maxHeight: 'max', alignment: 'topLeading' }}
		>
			<VStack spacing={layout.axisGap} alignment='leading'>
				{chartView(entry, domain, layout)}
				{layout.showAxis ? axisView(layout) : undefined}
			</VStack>
			{layout.showYAxis ? yAxisView(domain, layout) : undefined}
		</HStack>
	)
}

function chartView(
	entry: Entry,
	domain: Domain,
	layout: ChartLayout,
): NativeView {
	// Layered, every layer the same plotWidth x plotHeight box anchored top-left
	// so they register: a bottom baseline, an optional resting line, and the
	// candle columns on top. Vertical placement uses stacked fixed-height blocks
	// that sum to exactly plotHeight (no offset, no Spacer), so each element
	// lands precisely where its value maps and nothing can overflow or compress.
	const h = layout.plotHeight
	return (
		<ZStack alignment='topLeading' width={layout.plotWidth} height={h}>
			{hLine('baseline', h - 1, layout.plotWidth, h, AXIS_COLOR)}
			{layout.showYAxis
				? bpmTicks(domain).map((tick) =>
						hLine(
							`g${tick}`,
							valueToY(tick, domain, h),
							layout.plotWidth,
							h,
							GRID_COLOR,
						),
					)
				: undefined}
			{showRestingLine && entry.restingHr !== undefined
				? hLine(
						'resting',
						valueToY(entry.restingHr, domain, h),
						layout.plotWidth,
						h,
						['gray', 0.45],
					)
				: undefined}
			<HStack
				spacing={0}
				alignment='top'
				frame={{ width: layout.plotWidth, height: h }}
			>
				{entry.buckets.map((bucket) => candleColumn(bucket, domain, layout))}
			</HStack>
		</ZStack>
	)
}

// A 1px horizontal line at vertical position `y` within a w x h box, placed by
// fixed-height transparent blocks (no offset, no Spacer).
function hLine(
	id: string,
	y: number,
	w: number,
	h: number,
	color: Color,
): NativeView {
	const top = Math.max(0, Math.min(y, h - 1))
	return (
		<VStack id={id} spacing={0} width={w} height={h}>
			<Rectangle fill={['gray', 0]} width={w} height={top} />
			<Rectangle fill={color} width={w} height={1} />
			<Rectangle fill={['gray', 0]} width={w} height={h - top - 1} />
		</VStack>
	)
}

// Right-side BPM labels, one per gridline tick, each positioned at its value.
function yAxisView(domain: Domain, layout: ChartLayout): NativeView {
	const h = layout.plotHeight
	const w = layout.yLabelWidth
	return (
		<ZStack alignment='topLeading' width={w} height={h}>
			{bpmTicks(domain).map((tick) =>
				yLabel(tick, valueToY(tick, domain, h), w, h),
			)}
		</ZStack>
	)
}

const Y_LABEL_H = 11

function yLabel(value: number, y: number, w: number, h: number): NativeView {
	// Center the label box on the gridline; clamp so it stays inside the plot.
	// Three fixed heights summing to h (no Spacer) keep placement deterministic.
	const top = Math.max(0, Math.min(y - Y_LABEL_H / 2, h - Y_LABEL_H))
	return (
		<VStack id={`y${value}`} spacing={0} width={w} height={h}>
			<Rectangle fill={['gray', 0]} width={w} height={top} />
			<Text
				value={`${value}`}
				fontSize={9}
				foreground='secondary'
				fontDesign='rounded'
				monospacedDigit
				height={Y_LABEL_H}
			/>
			<Rectangle fill={['gray', 0]} width={w} height={h - top - Y_LABEL_H} />
		</VStack>
	)
}

function candleColumn(
	bucket: HourBucket,
	domain: Domain,
	layout: ChartLayout,
): NativeView {
	const h = layout.plotHeight
	// Empty hours reserve the slot width with a transparent full-height block so
	// the 24 columns stay aligned and the hour reads as a gap.
	if (bucket.count === 0 || bucket.segments.length === 0) {
		return (
			<Rectangle
				id={`h${bucket.hour}`}
				fill={['gray', 0]}
				width={layout.slot}
				height={h}
			/>
		)
	}

	// One capsule per detached BPM segment, each floated to its band. Layered in
	// a slot-wide ZStack so a spike sits separate from the resting band.
	return (
		<ZStack
			id={`h${bucket.hour}`}
			alignment='topLeading'
			width={layout.slot}
			height={h}
		>
			{bucket.segments.map((segment, i) =>
				segmentBar(segment, domain, layout, i),
			)}
		</ZStack>
	)
}

// A single segment's capsule, centered in the slot and floated to its band by
// fixed-height transparent blocks above and below (no offset, no Spacer). A
// flat single-reading segment renders as a round dot (height clamped to width).
function segmentBar(
	segment: Segment,
	domain: Domain,
	layout: ChartLayout,
	index: number,
): NativeView {
	const h = layout.plotHeight
	// Floor the dot/segment at MIN_BODY so a single reading stays visible even
	// on small widgets, but let it grow to barWidth so it reads as a round dot.
	const minBody = Math.max(MIN_BODY, layout.barWidth)
	const geo = segmentGeometry(segment.min, segment.max, domain, h, minBody)
	const mid = (segment.min + segment.max) / 2
	const color = colorByZone ? zoneColor(mid) : accentColor
	return (
		<VStack
			id={`s${index}`}
			alignment='center'
			spacing={0}
			width={layout.slot}
			height={h}
		>
			<Rectangle fill={['gray', 0]} width={layout.slot} height={geo.top} />
			<Capsule fill={color} width={layout.barWidth} height={geo.height} />
			<Rectangle
				fill={['gray', 0]}
				width={layout.slot}
				height={h - geo.top - geo.height}
			/>
		</VStack>
	)
}

function headerView(entry: Entry): NativeView {
	const headerColor =
		colorByZone && entry.latestHr !== undefined
			? zoneColor(entry.latestHr)
			: accentColor

	return (
		<HStack maxWidth spacing={4}>
			<Text
				value='Heart Rate'
				fontSize={12}
				foreground='primary'
				fontWeight={700}
			/>
			<Spacer />
			<Text
				value={formatBpm(entry.latestHr)}
				fontSize={14}
				foreground={headerColor}
				fontWeight={800}
				fontDesign='rounded'
				monospacedDigit
			/>
			<Text value='bpm' fontSize={10} foreground='secondary' fontWeight={600} />
		</HStack>
	)
}

function axisView(layout: ChartLayout): NativeView {
	const labels = hourTickLabels()
	return (
		<HStack width={layout.plotWidth}>
			{tickText(labels[0]!)}
			<Spacer />
			{tickText(labels[1]!)}
			<Spacer />
			{tickText(labels[2]!)}
			<Spacer />
			{tickText(labels[3]!)}
			<Spacer />
			{tickText(labels[4]!)}
		</HStack>
	)
}

function tickText(label: string): NativeView {
	return (
		<Text
			value={label}
			fontSize={9}
			foreground='secondary'
			fontDesign='rounded'
		/>
	)
}

function inlineView(entry: Entry, stats: DayStats): NativeView {
	const latest = formatBpm(entry.latestHr)
	const range = formatRange(stats.min, stats.max)
	return <Text value={`HR ${latest} bpm  (${range})`} />
}

// Placeholder for a day with no readings. Fills the plot area (maxHeight) so
// the header and footer stay put and the user can still page to another day.
function emptyChart(kind: ChartKind): NativeView {
	return (
		<ZStack
			alignment='center'
			frame={{ maxWidth: 'max', maxHeight: 'max', alignment: 'center' }}
		>
			<VStack spacing={4} alignment='center'>
				<Icon
					value='heart.text.square'
					fontSize={kind === 'compact' ? 16 : 22}
					foreground='secondary'
				/>
				{kind === 'compact' ? undefined : (
					<Text
						value='No heart rate this day'
						fontSize={11}
						foreground='secondary'
						fontWeight={600}
					/>
				)}
			</VStack>
		</ZStack>
	)
}

// Bottom paging control: prev (older) on the left, the day label centered, and
// next (newer) on the right, hidden once today is reached. Small, plain
// buttons like the agent-usage refresh button.
function footerView(
	entry: Entry,
	prevIntent: IntentInfo,
	nextIntent: IntentInfo,
): NativeView {
	return (
		<HStack maxWidth spacing={6}>
			<Button intent={prevIntent} buttonStyle='plain'>
				<Icon value='chevron.left' fontSize={11} foreground='secondary' />
			</Button>
			<Spacer />
			<Text
				value={entry.dayLabel}
				fontSize={10}
				foreground='secondary'
				fontWeight={600}
				fontDesign='rounded'
			/>
			<Spacer />
			{entry.dayOffset > 0 ? (
				<Button intent={nextIntent} buttonStyle='plain'>
					<Icon value='chevron.right' fontSize={11} foreground='secondary' />
				</Button>
			) : undefined}
		</HStack>
	)
}
