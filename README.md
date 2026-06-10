<p align="center">
  <img src="screen.jpg?raw=true" width="270" height="480" />
  <h3 align="center">Await - Health Widget</h3>
</p>

An [Await](https://await-app.com) widget that charts a full day of heart rate
as an hourly min-max candle chart, in the spirit of the Apple Watch composite
face. Each of the 24 columns spans that hour's lowest-to-highest BPM, colored by
heart-rate zone, with an optional resting-rate reference line.

- 24 hourly candles for the current day, scaled to any widget size
- Six color themes, each with its own zone ramp (cool to warm as the rate climbs)
- Optional resting heart rate reference line
- Works across system and lock-screen families; `accessoryInline` shows a text
  summary since it cannot draw shapes

## Configuration

The controls are exposed as `@panel` values in the Await editor:

| Panel             | Default     | Effect                                              |
| ----------------- | ----------- | --------------------------------------------------- |
| `theme`           | `Blueprint` | Color palette and zone ramp (menu of six)           |
| `showRestingLine` | `true`      | Draw a reference line at resting heart rate         |
| `useSampleData`   | `false`     | Render a synthetic day to preview without real data |

Themes: `Blueprint`, `Sourberry`, `Deepforest`, `Marshmallow`, `Stranding`,
`Shogoki`. Wider widgets also show a right-side y-axis with rounded BPM stops
and faint gridlines. Hours with no readings stay blank, so coverage gaps read as
gaps.

## Data source

Heart rate comes from the Await health bridge's series API
(`@await-widget/runtime` 0.0.17+):

```ts
AwaitHealth.get({ start, end }) // -> { heartRate?: { value, startDate, endDate }[] }
```

The widget requests the current day (local midnight to now), buckets the raw
samples into 24 hours in plain JS, and renders the per-hour range. When the host
returns no data, the widget shows an "unavailable" state rather than an
authorization flow: heart rate access is granted to the Await app, not from
inside the widget.

## Installation

- Copy the contents of `index.tsx` from the latest release.
- Open the `Await` app, create a new widget, name it.
- Tap the "..." menu on the top right, then "Paste to Index".

## Development

[`bun`](https://bun.sh) is required.

```sh
bun install
bun run build      # writes build/index.tsx
bun test           # unit tests for bucketing, layout, and formatting
bun run typecheck  # tsc --noEmit
bun run fix        # format with biome (a pre-commit hook runs it on staged files)
```

Copy `build/index.tsx` onto the device through the Await app.

### A note on minification

`bun run build:prod` minifies, but minification strips comments, including the
`// @panel` annotations the Await app reads. The build script detects panels and
falls back to the readable output, so the released artifact always keeps its
panel controls. Release workflows use the readable `bun run build` for this
reason.

## License

MIT © [mogita](https://github.com/mogita)
</content>
</invoke>
