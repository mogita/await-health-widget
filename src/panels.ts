// Tunable controls surfaced in the Await app's panel editor. Each `@panel`
// comment must sit immediately above a top-level `const` with a literal value.

// @panel {type:'color'}
export const accentColor = 'FF375F'

// @panel
export const colorByZone = true

// @panel
export const showRestingLine = true

// @panel {type:'menu',items:['capsule','rounded','bar']}
export const barShape = 'capsule'

// Render a synthetic day of heart rate so the chart is visible without real
// HealthKit data (useful right after pasting, or on devices with no readings).
// Leave off for live data.
// @panel
export const useSampleData = false
