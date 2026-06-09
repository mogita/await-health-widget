// Tunable controls surfaced in the Await app's panel editor. Each `@panel`
// comment must sit immediately above a top-level `const` with a literal value.

// Color theme. Keep these items in sync with the THEMES keys in theme.ts (the
// menu list must be a static literal, so it cannot be derived from that record).
// @panel {type:'menu',items:['Blueprint','Sourberry','Deepforest','Marshmallow']}
export const theme = 'Blueprint'

// @panel
export const showRestingLine = true

// Render a synthetic day of heart rate so the chart is visible without real
// HealthKit data (useful right after pasting, or on devices with no readings).
// Leave off for live data.
// @panel
export const useSampleData = false
