# Architecture

There are **two generators** that emit the same reproducible R project. Keeping
them in agreement is the central design constraint of this repo.

## 1. `setup.R` (classic, interactive)

A single R script dropped into an empty folder and run in RStudio. It prompts
for a handful of options (project name, author, CRS, numbering style, renv),
then writes the directory tree and files in place. It is deliberately simple and
covers a fixed, spatial-leaning setup.

## 2. The web app (`site/`)

A static, build-step-free site — plain HTML/CSS/JS — that mirrors `setup.R` but
exposes far more toggles and builds the project as a zip in the browser with
[JSZip](https://stuk.github.io/jszip/). Nothing is uploaded.

```
site/
├── index.html   # the builder form + marketing/FAQ sections
├── style.css    # all styling (light/dark themes via CSS variables)
├── app.js       # the generator: PACKAGES catalogue, PRESETS, gen* functions
└── vendor/      # JSZip + FileSaver (client-side zipping/download)
```

### How `app.js` is organised

- `PACKAGES` — the package catalogue (order = load order in `R/config.R`).
- `PRESETS` — named starting points that patch the form.
- `readConfig()` — reads the form into a plain config object `c`.
- `gen*()` functions — one per generated file (`genConfig`, `genReadme`,
  `genMakefile`, `genTargetsFile`, …). Each returns file **text**.
- `buildTree()` — the ASCII tree used in both the live preview and the README.
- `buildFiles(c)` — assembles the `{ path: content }` map that becomes the zip.
- `downloadZip()` — zips `buildFiles` output and triggers the download.

## Generated project shape

```
my-project/
├── my-project.Rproj
├── R/
│   ├── config.R        # paths, CRS, theme, set.seed() — sourced everywhere
│   └── functions.R     # only when targets is enabled
├── 01_data/{raw_data,clean_data}/
├── 02_scripts/         # numbered pipeline: download → clean → model → visualize → report
└── 03_outputs/{figures,tables}/
```

Every script starts with `source(here::here("R", "config.R"))`, so paths and
packages are consistent no matter where a script is run from.

## Deployment

`.github/workflows/deploy-pages.yml` publishes `site/` to GitHub Pages on pushes
to `main` that touch `site/`. There is no build step — the deployed files are the
source files.
