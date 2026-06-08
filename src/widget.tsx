import {
	Capsule,
	Color,
	HStack,
	Icon,
	Rectangle,
	RoundedRectangle,
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
import { accentColor, barShape, colorByZone, showRestingLine } from './panels'

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
				spacing={6}
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
	const restY =
		entry.restingHr === undefined
			? undefined
			: valueToY(entry.restingHr, domain, layout.plotHeight)

	return (
		<ZStack
			alignment='topLeading'
			width={layout.plotWidth}
			height={layout.plotHeight}
		>
			<Rectangle
				fill={AXIS_COLOR}
				width={layout.plotWidth}
				height={1}
				offsetY={layout.plotHeight - 1}
			/>
			{showRestingLine && restY !== undefined ? (
				<Rectangle
					fill={['gray', 0.45]}
					width={layout.plotWidth}
					height={1}
					offsetY={restY}
				/>
			) : undefined}
			<HStack spacing={layout.gap} alignment='top'>
				{entry.buckets.map((bucket) => candleColumn(bucket, domain, layout))}
			</HStack>
		</ZStack>
	)
}

function candleColumn(
	bucket: HourBucket,
	domain: Domain,
	layout: ChartLayout,
): NativeView {
	// Every column is the same fixed-size ZStack so the 24 hours stay aligned
	// whether or not an hour has readings. Empty hours hold a transparent
	// baseline tick; data hours hold the offset candle body.
	let child: NativeView
	if (bucket.count === 0) {
		child = (
			<Rectangle
				fill={['gray', 0]}
				width={layout.barWidth}
				height={1}
				offsetY={layout.plotHeight - 1}
			/>
		)
	} else {
		const geo = candleGeometry(bucket, domain, layout.plotHeight)
		const color = colorByZone ? zoneColor(bucket.avg) : accentColor
		child = bar(color, layout.barWidth, geo.height, geo.top, layout.radius)
	}

	return (
		<ZStack
			id={`h${bucket.hour}`}
			alignment='top'
			width={layout.barWidth}
			height={layout.plotHeight}
		>
			{child}
		</ZStack>
	)
}

function bar(
	color: Color,
	width: number,
	height: number,
	top: number,
	radius: number,
): NativeView {
	// Widened: the panel can swap the value at runtime, so compare as string.
	const shape: string = barShape
	if (shape === 'bar') {
		return (
			<Rectangle fill={color} width={width} height={height} offsetY={top} />
		)
	}
	if (shape === 'rounded') {
		return (
			<RoundedRectangle
				rectRadius={radius}
				fill={color}
				width={width}
				height={height}
				offsetY={top}
			/>
		)
	}
	return <Capsule fill={color} width={width} height={height} offsetY={top} />
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
