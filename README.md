# R Project Scaffolder

A best-practice template for **reproducible R pipelines** — plus a gorgeous,
zero-install web app that lets anyone name, configure, and download a ready-to-go
project as a zip.

> **Live site:** https://noahweidig.github.io/r-proj-template/

## Two ways to use it

### 1 · The web scaffolder (recommended)

Open the [site](https://noahweidig.github.io/r-proj-template/), fill in a few
fields (project name, author, packages, CRS, renv/Quarto/Makefile toggles),
watch the live preview, and click **Download**. You get a zip containing a
fully-configured project — no script to run. Everything happens in your
browser; nothing is uploaded.

### 2 · `setup.R` (classic)

Prefer to scaffold interactively in RStudio? Drop [`setup.R`](setup.R) into an
empty project folder, open it, and run it. It prompts for the same options and
writes the structure in place (and can initialise `renv`).

## What you get

```
my-project/
├── my-project.Rproj      # open this in RStudio
├── config.R              # paths, CRS, theme, set.seed() — sourced everywhere
├── README.md
├── LICENSE
├── renv.lock             # pinned package versions (when renv enabled)
├── Makefile              # `make all` runs the whole pipeline
├── 01_data/
│   ├── raw_data/         # original data, never edited
│   └── clean_data/       # processed, analysis-ready data
├── 02_scripts/
│   ├── 01_download_data.R
│   ├── 02_clean_data.R
│   ├── 03_model_data.R
│   ├── 04_visualize_data.R
│   └── 05_report_data.qmd
└── 03_outputs/
    ├── figures/
    └── tables/
```

### Reproducibility built in

- **`here::here()`** paths — scripts run correctly from anywhere.
- **`renv`** — pin and restore exact package versions across machines.
- **Seeded** — `set.seed()` wired into `config.R`.
- **Numbered pipeline** — download → clean → model → visualize → report.
- **Makefile** — one command to reproduce every output.
- **Optional CI** — a GitHub Action that runs the pipeline on push.

## Developing the site

The web app is a static site in [`site/`](site/) — plain HTML/CSS/JS with
[JSZip](https://stuk.github.io/jszip/) for client-side zipping. No build step.

```bash
cd site
python3 -m http.server 8000   # then open http://localhost:8000
```

The project generators live in `site/app.js` and mirror the output of
`setup.R`. Pushes to `main` that touch `site/` are deployed to GitHub Pages by
[`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml).

> **Enabling Pages:** in repo **Settings → Pages**, set **Source** to
> **GitHub Actions**.

## License

MIT — see [LICENSE](LICENSE).
