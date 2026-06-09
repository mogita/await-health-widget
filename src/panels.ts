// Tunable controls surfaced in the Await app's panel editor. Each `@panel`
// comment must sit immediately above a top-level `const` with a literal value.

// @panel {type:'color'}
export const accentColor = 'f88dad'

// @panel
export const colorByZone = true

// @panel
export const showRestingLine = true

// Render a synthetic day of heart rate so the chart is visible without real
// HealthKit data (useful right after pasting, or on devices with no readings).
// Leave off for live data.
// @panel
export const useSampleData = false
