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
import { MIN_BODY } from './config'
import {
	formatAgo,
	formatBpm,
	formatHourTick,
	formatRange,
	HOUR_TICKS,
} from './format'
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
	type ChartKind,
	type ChartLayout,
	classifyFamily,
	computeLayout,
	segmentGeometry,
	valueToY,
} from './layout'
import { showRestingLine, theme } from './panels'
import { resolveTheme, zoneColor } from './theme'

// Resolve the panel-selected theme once; every render function reads from it.
// An unknown name (e.g. a theme removed from the code) falls back to the first.
const THEME = resolveTheme(theme)

export function widget(
	entry: WidgetEntry<Entry> & {
		prevIntent: IntentInfo
		nextIntent: IntentInfo
		todayIntent: IntentInfo
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
			<Color value={THEME.background} />
			<VStack
				alignment='leading'
				spacing={layout.spacing}
				padding={{
					top: layout.padTop,
					left: layout.padding,
					right: layout.padding,
					bottom: layout.padBottom,
				}}
				frame={{ maxWidth: 'max', maxHeight: 'max', alignment: 'topLeading' }}
			>
				{layout.showHeader ? statsHeader(entry) : undefined}
				{body}
				{layout.showFooter
					? footerView(
							entry,
							entry.date.getTime(),
							entry.prevIntent,
							entry.nextIntent,
							entry.todayIntent,
						)
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
	const domain = computeDomain(entry.buckets, entry.restingHr)
	return (
		<HStack
			spacing={layout.hgap}
			alignment='top'
			frame={{ maxHeight: 'max', alignment: 'leading' }}
		>
			{layout.showYAxis ? yAxisView(domain, layout) : undefined}
			<VStack spacing={layout.axisGap} alignment='leading'>
				{chartView(entry, domain, layout)}
				{layout.showAxis ? axisView(layout) : undefined}
			</VStack>
		</HStack>
	)
}

function chartView(
	entry: Entry,
	domain: Domain,
	layout: ChartLayout,
): NativeView {
	// Layered, every layer the same plotWidth x plotHeight box anchored top-left.
	// Background context first: baseline, faint vertical hour gridlines, and the
	// pale resting line — all BEHIND the candles so the bars stay the focus.
	// Lines are placed by fixed-size transparent blocks (no offset, no Spacer).
	const h = layout.plotHeight
	return (
		<ZStack alignment='topLeading' width={layout.plotWidth} height={h}>
			{hLine('baseline', h - 1, layout.plotWidth, h, THEME.axis)}
			{HOUR_TICKS.filter((hour) => hour > 0).map((hour) =>
				vLine(`v${hour}`, hour * layout.slot, layout.plotWidth, h, THEME.grid),
			)}
			{showRestingLine && entry.restingHr !== undefined
				? hLine(
						'resting',
						valueToY(entry.restingHr, domain, h),
						layout.plotWidth,
						h,
						THEME.resting,
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
	thickness = 1,
): NativeView {
	const t = Math.max(1, thickness)
	const top = Math.max(0, Math.min(y, h - t))
	return (
		<VStack id={id} spacing={0} width={w} height={h}>
			<Rectangle fill={['gray', 0]} width={w} height={top} />
			<Rectangle fill={color} width={w} height={t} />
			<Rectangle fill={['gray', 0]} width={w} height={h - top - t} />
		</VStack>
	)
}

// A 1px vertical line at horizontal position `x`, placed by fixed-width
// transparent blocks (the column-wise mirror of hLine).
function vLine(
	id: string,
	x: number,
	w: number,
	h: number,
	color: Color,
): NativeView {
	const left = Math.max(0, Math.min(x, w - 1))
	return (
		<HStack id={id} spacing={0} width={w} height={h}>
			<Rectangle fill={['gray', 0]} width={left} height={h} />
			<Rectangle fill={color} width={1} height={h} />
			<Rectangle fill={['gray', 0]} width={w - left - 1} height={h} />
		</HStack>
	)
}

// Left y-axis: just the day's max (top) and min (bottom) — the floor/ceil of
// the tight domain — right-aligned toward the plot.
function yAxisView(domain: Domain, layout: ChartLayout): NativeView {
	return (
		<VStack
			alignment='trailing'
			spacing={0}
			width={layout.yLabelWidth}
			height={layout.plotHeight}
		>
			{yLabel(domain.hi)}
			<Spacer />
			{yLabel(domain.lo)}
		</VStack>
	)
}

function yLabel(value: number): NativeView {
	return (
		<Text
			value={`${value}`}
			fontSize={7}
			foreground={THEME.textSecondary}
			fontDesign='rounded'
			monospacedDigit
		/>
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
	const color = zoneColor(THEME, mid)
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

// Header: a heart glyph nudged to the top-right of the left corner, and a
// compact two-column Latest/Resting stat block on the right. Values are neutral
// white (the chart bars carry the zone colors). Freshness lives in the footer.
function statsHeader(entry: Entry): NativeView {
	return (
		<HStack maxWidth spacing={6} alignment='top'>
			<Icon
				value='heart.fill'
				fontSize={16}
				foreground={THEME.heart}
				offset={{ x: 3, y: 5 }}
			/>
			<Spacer />
			<VStack alignment='leading' spacing={0}>
				{statRow('Latest', entry.latestHr)}
				{statRow('Resting', entry.restingHr)}
			</VStack>
		</HStack>
	)
}

function statRow(label: string, value: number | undefined): NativeView {
	return (
		<HStack spacing={3} alignment='lastTextBaseline'>
			{/* Right-aligned label hugs the value so the label/value pair reads as a
			    unit and both rows share the same tight gap. */}
			<Text
				value={label}
				fontSize={10}
				fontWeight={600}
				foreground={THEME.textSecondary}
				lineLimit={1}
				minimumScaleFactor={0.8}
				frame={{ width: 42, alignment: 'trailing' }}
			/>
			<Text
				value={formatBpm(value)}
				fontSize={10}
				fontWeight={700}
				foreground={THEME.textPrimary}
				fontDesign='rounded'
				monospacedDigit
			/>
			<Text
				value='bpm'
				fontSize={8}
				fontWeight={600}
				foreground={THEME.textSecondary}
			/>
		</HStack>
	)
}

// "X min ago" for today only (minute granularity, no seconds); nothing for a
// past day, where elapsed time is not meaningful.
function freshnessText(entry: Entry, nowMs: number): string | undefined {
	if (entry.dayOffset !== 0 || entry.latestAtMs === undefined) return undefined
	return formatAgo(nowMs - entry.latestAtMs)
}

// X-axis hour labels (00/06/12/18), each pinned to the left of a 6-hour
// segment so it sits under its vertical gridline.
function axisView(layout: ChartLayout): NativeView {
	const segment = 6 * layout.slot
	return (
		<HStack spacing={0} width={layout.plotWidth}>
			{HOUR_TICKS.map((hour) => (
				<HStack id={`x${hour}`} spacing={0} width={segment}>
					{tickText(formatHourTick(hour))}
					<Spacer />
				</HStack>
			))}
		</HStack>
	)
}

function tickText(label: string): NativeView {
	return (
		<Text
			value={label}
			fontSize={7}
			foreground={THEME.textSecondary}
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
					foreground={THEME.textSecondary}
				/>
				{kind === 'compact' ? undefined : (
					<Text
						value='No heart rate this day'
						fontSize={11}
						foreground={THEME.textSecondary}
						fontWeight={600}
					/>
				)}
			</VStack>
		</ZStack>
	)
}

// Enlarged tap target for an arrow: the whole NAV_TAP_W x NAV_TAP_H box is
// tappable (the transparent rectangle fills it), not just the glyph. The glyph
// is aligned to the outer edge so it sits close to the widget border.
const NAV_TAP_W = 40
const NAV_TAP_H = 24 // tracks FOOTER_H in layout.ts

function navButton(
	intent: IntentInfo,
	icon: string,
	align: Alignment,
): NativeView {
	return (
		<Button intent={intent} buttonStyle='plain'>
			<ZStack alignment={align} width={NAV_TAP_W} height={NAV_TAP_H}>
				<Rectangle fill={['gray', 0]} width={NAV_TAP_W} height={NAV_TAP_H} />
				<Icon value={icon} fontSize={12} foreground={THEME.textSecondary} />
			</ZStack>
		</Button>
	)
}

// Bottom paging control. Both ends reserve an equal NAV_TAP_W slot (a
// transparent placeholder stands in for the hidden next button) so the centered
// day label stays centered in the widget. The label is stacked over the
// freshness ("X min ago") on today only; tapping it jumps back to today.
function footerView(
	entry: Entry,
	nowMs: number,
	prevIntent: IntentInfo,
	nextIntent: IntentInfo,
	todayIntent: IntentInfo,
): NativeView {
	const ago = freshnessText(entry, nowMs)
	return (
		<HStack maxWidth>
			{navButton(prevIntent, 'arrow.left', 'leading')}
			<Spacer />
			<Button intent={todayIntent} buttonStyle='plain'>
				<VStack
					spacing={0}
					alignment='center'
					padding={{ horizontal: 6, vertical: 2 }}
				>
					<Text
						value={entry.dayLabel}
						fontSize={9}
						foreground={THEME.textSecondary}
						fontWeight={600}
						fontDesign='rounded'
						lineLimit={1}
						minimumScaleFactor={0.7}
					/>
					{ago !== undefined ? (
						<Text
							value={ago}
							fontSize={8}
							foreground={THEME.textSecondary}
							fontWeight={500}
							lineLimit={1}
							minimumScaleFactor={0.7}
						/>
					) : undefined}
				</VStack>
			</Button>
			<Spacer />
			{entry.dayOffset > 0 ? (
				navButton(nextIntent, 'arrow.right', 'trailing')
			) : (
				<Rectangle fill={['gray', 0]} width={NAV_TAP_W} height={NAV_TAP_H} />
			)}
		</HStack>
	)
}
