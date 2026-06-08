import { REFRESH_MS } from './config'
import { buildEntry, type Entry } from './health'
import { useSampleData } from './panels'

// Single entry per refresh: the day's hourly heart-rate candles plus the
// resting and latest readings. iOS is asked to refresh again after REFRESH_MS.
export async function widgetTimeline(): Promise<Timeline<Entry>> {
	const now = new Date()
	const entry = await buildEntry(now, useSampleData)

	return {
		entries: [{ date: now, ...entry }],
		update: new Date(now.getTime() + REFRESH_MS),
	}
}
