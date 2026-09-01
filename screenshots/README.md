# Fat2Flat Fitness — App Store screenshots

Reproducible generator for the iOS App Store screenshot set. Layouts are
rendered in headless Chromium, so every export is pixel-identical and can be
regenerated whenever the copy, numbers or branding change.

## Generate

```bash
npm install
node generate.mjs                 # every size
node generate.mjs --sizes 6.9     # just one
node generate.mjs --logo assets/logo.png
```

Output lands in `out/<size>/NN-<screen>.png`, ready to upload to
App Store Connect.

## Sizes

| Key   | Pixels      | Devices                            |
|-------|-------------|------------------------------------|
| `6.9` | 1320 × 2868 | iPhone 16/17 Pro Max — **required** |
| `6.7` | 1290 × 2796 | iPhone 14/15 Pro Max               |
| `6.5` | 1242 × 2688 | iPhone 11 Pro Max, XS Max          |

App Store Connect scales the 6.9" set down for smaller devices, so uploading
`6.9` alone is enough; the other two are there if you'd rather upload
natively-rendered images for each class.

## How it works

- `src/screens.js` — all five screens, authored at iPhone logical size
  (393 × 852 pt) as plain markup.
- `src/poster.css` — the design system: brand colours, cards, chips, chart
  and device frame.
- `src/render.js` — computes the poster geometry for the target canvas and
  scales the phone UI by a single factor (`--k`), so the artwork is identical
  at every resolution instead of being re-flowed per size.
- `generate.mjs` — drives Chromium and writes the PNGs. It reports how each
  screen fills the phone body (`0px of slack` = the content lands exactly on
  the tab bar), which is what keeps the screenshots free of dead space.

## Swapping in the real logo

Drop the app icon at `assets/logo.png` and re-run. Without it the generator
falls back to a built-in wordmark lockup.

## Editing the copy

Headlines, subheads and screen order live in the `SLIDES` array at the bottom
of `src/screens.js`. Keep headlines to two lines — the `<br>` is explicit so
wrapping never changes between export sizes.
