import type { Entry } from './health'
import { nextDay, prevDay } from './nav'
import { widgetTimeline } from './timeline'
import { widget } from './widget'

const app = Await.define({
	widget: (entry: WidgetEntry<Entry>): NativeView =>
		widget({
			...entry,
			prevIntent: app.prevDay(),
			nextIntent: app.nextDay(),
		}),
	widgetTimeline,
	widgetIntents: { prevDay, nextDay },
})
