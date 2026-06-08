import {
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
import { AXIS_COLOR, BACKGROUND, zoneColor } from './config'
import { formatBpm, formatRange, hourTickLabels } from './format'
import {
	computeDomain,
	type DayStats,
	type Domain,
	dayStats,
	type Entry,
	type HourBucket,
} from './health'
import {
	type ChartKind,
	type ChartLayout,
	candleGeometry,
	classifyFamily,
	computeLayout,
	valueToY,
} from './layout'
import { accentColor, colorByZone, showRestingLine } from './panels'

export function widget(entry: WidgetEntry<Entry>): NativeView {
	const kind = classifyFamily(entry.family)
	const stats = dayStats(entry.buckets)

	if (kind === 'inline') return inlineView(entry, stats)
	if (!entry.hasData) return emptyView(kind)

	const layout = computeLayout(entry.size, kind)
	const domain = computeDomain(entry.buckets)
	const chart = chartView(entry, domain, layout)

	if (kind === 'compact') {
		return (
			<ZStack alignment='topLeading' maxSides>
				<VStack
					padding={layout.padding}
					frame={{ maxWidth: 'max', maxHeight: 'max', alignment: 'topLeading' }}
				>
					{chart}
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
				{chart}
				{layout.showAxis ? axisView() : undefined}
			</VStack>
		</ZStack>
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
			<VStack spacing={0} width={layout.plotWidth} height={h}>
				<Rectangle fill={['gray', 0]} width={layout.plotWidth} height={h - 1} />
				<Rectangle fill={AXIS_COLOR} width={layout.plotWidth} height={1} />
			</VStack>
			{showRestingLine && entry.restingHr !== undefined
				? restingLine(entry.restingHr, domain, layout)
				: undefined}
			<HStack
				spacing={layout.gap}
				alignment='top'
				frame={{ width: layout.plotWidth, height: h }}
			>
				{entry.buckets.map((bucket) => candleColumn(bucket, domain, layout))}
			</HStack>
		</ZStack>
	)
}

function restingLine(
	resting: number,
	domain: Domain,
	layout: ChartLayout,
): NativeView {
	const h = layout.plotHeight
	// Clamp so the line (1px) plus the gap above it never exceeds the plot.
	const y = Math.min(valueToY(resting, domain, h), h - 1)
	return (
		<VStack spacing={0} width={layout.plotWidth} height={h}>
			<Rectangle fill={['gray', 0]} width={layout.plotWidth} height={y} />
			<Rectangle fill={['gray', 0.45]} width={layout.plotWidth} height={1} />
			<Rectangle
				fill={['gray', 0]}
				width={layout.plotWidth}
				height={h - y - 1}
			/>
		</VStack>
	)
}

function candleColumn(
	bucket: HourBucket,
	domain: Domain,
	layout: ChartLayout,
): NativeView {
	const h = layout.plotHeight
	// Empty hours reserve the column width with a transparent full-height block
	// so the 24 columns stay aligned.
	if (bucket.count === 0) {
		return (
			<Rectangle
				id={`h${bucket.hour}`}
				fill={['gray', 0]}
				width={layout.barWidth}
				height={h}
			/>
		)
	}

	// A floating candle: transparent top gap (down to the hour's max), the
	// min..max capsule, then a transparent bottom gap. The three fixed heights
	// sum to plotHeight (candleGeometry guarantees top + height <= plotHeight).
	const geo = candleGeometry(bucket, domain, h)
	const color = colorByZone ? zoneColor(bucket.avg) : accentColor
	return (
		<VStack
			id={`h${bucket.hour}`}
			spacing={0}
			width={layout.barWidth}
			height={h}
		>
			<Rectangle fill={['gray', 0]} width={layout.barWidth} height={geo.top} />
			<Capsule fill={color} width={layout.barWidth} height={geo.height} />
			<Rectangle
				fill={['gray', 0]}
				width={layout.barWidth}
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

function axisView(): NativeView {
	const labels = hourTickLabels()
	return (
		<HStack maxWidth>
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

function emptyView(kind: ChartKind): NativeView {
	if (kind === 'compact') {
		return (
			<ZStack alignment='center' maxSides>
				<Text
					value='No HR'
					fontSize={11}
					foreground='secondary'
					fontWeight={600}
				/>
			</ZStack>
		)
	}

	return (
		<ZStack alignment='center' maxSides>
			<Color value={BACKGROUND} />
			<VStack spacing={6} alignment='center' padding={16}>
				<Icon value='heart.text.square' fontSize={26} foreground='secondary' />
				<Text
					value='No heart rate yet today'
					fontSize={12}
					foreground='primary'
					fontWeight={600}
				/>
				<Text
					value='Readings appear as your watch records them'
					fontSize={10}
					foreground='secondary'
					lineLimit={2}
					textAlignment='center'
				/>
			</VStack>
		</ZStack>
	)
}
