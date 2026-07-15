# Conventions

## Parity: `setup.R` ⇄ `site/app.js`

The two generators must emit compatible projects. `setup.R` is the fixed,
interactive baseline; `app.js` is the configurable superset. When you change the
shape of a generated project, change both. Common touch points:

- **Config location** — universal config lives at `R/config.R`, and every
  emitted script/report sources it via `source(here::here("R", "config.R"))`.
- **Numbered pipeline** — `download → clean → model → visualize → report`, with a
  numbering style (`padded`, `plain`, `alpha`, `upper`, `none`).
- **Directory tree** — kept identical between the live preview (`buildTree` in
  `app.js`) and the actual files written (`buildFiles` in `app.js` / the
  `write_file` calls in `setup.R`).

## Package catalogue (`PACKAGES` in `app.js`)

- The array order is the order packages are written into `R/config.R`.
- `here` is loaded first so project paths are available immediately; the rest is
  **tidyverse-first**.
- `vroom` is the default for fast, tidy reading/writing of delimited files
  (`vroom()` / `vroom_write(..., delim = ",")`) — it returns a tibble and works
  cleanly with dplyr.
- `spatial: true` packages (`sf`, `terra`, `leaflet`) are managed by the spatial
  toggle rather than the plain package grid.
- Plot-composition helpers (`patchwork`, `cowplot`) and cloud I/O
  (`googledrive`) are opt-in catalogue entries.

## Copy lives in three places

When a catalogue or structure change lands, update the user-facing copy too:

1. `index.html` — feature cards, the **All options** table, and the FAQ.
2. `README.md` (repo root) — the "what you get" tree and the reproducibility
   bullet list.
3. The generated `README.md` (`genReadme` in `app.js`, and the README block in
   `setup.R`).

## Static-site rules

- No build step, no external runtime dependencies beyond the vendored JSZip /
  FileSaver. Everything runs client-side.
- Icons are inline SVG (including the favicon) — no emoji glyphs, so rendering is
  consistent across platforms.
- Styling is theme-aware through CSS custom properties; support both light and
  dark.
