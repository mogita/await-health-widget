import { REFRESH_MS } from './config'
import { buildEntry, type Entry } from './health'
import { readDayOffset } from './nav'
import { useSampleData } from './panels'

// Single entry per refresh: the chosen day's hourly candles plus resting and
// latest readings. Today auto-refreshes after REFRESH_MS; a past day is static
// (it only changes when the prev/next intent re-runs this timeline).
export async function widgetTimeline(): Promise<Timeline<Entry>> {
	const now = new Date()
	const offset = readDayOffset()
	const entry = await buildEntry(now, useSampleData, offset)

	return {
		entries: [{ date: now, ...entry }],
		update: offset === 0 ? new Date(now.getTime() + REFRESH_MS) : 'never',
	}
}
