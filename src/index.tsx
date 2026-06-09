import type { Entry } from './health'
import { nextDay, prevDay, today } from './nav'
import { widgetTimeline } from './timeline'
import { widget } from './widget'

const app = Await.define({
	widget: (entry: WidgetEntry<Entry>): NativeView =>
		widget({
			...entry,
			prevIntent: app.prevDay(),
			nextIntent: app.nextDay(),
			todayIntent: app.today(),
		}),
	widgetTimeline,
	widgetIntents: { prevDay, nextDay, today },
})
