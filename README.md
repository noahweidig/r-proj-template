# R Project Template

The one-stop shop for **reproducible R pipelines** — a gorgeous, zero-install
web app that lets anyone name, configure, and download a ready-to-go project
as a zip. 25+ toggles cover packages, pipeline style, containers, CI, and
docs, so you can dial in exactly the amount of reproducibility rigor a
project needs.

> **Live site:** https://noahweidig.github.io/r-proj-template/

## Two ways to use it

### 1 · The web template (recommended)

Open the [site](https://noahweidig.github.io/r-proj-template/), fill in a few
fields (project name, author, packages, CRS, renv/targets/Quarto/Makefile/
Docker/Dev Container toggles), watch the live preview across six tabs, and
click **Download**. You get a zip containing a fully-configured project — no
script to run. Everything happens in your browser; nothing is uploaded.

Your setup autosaves in the browser, and can be exported to JSON, imported
back in, or shared as a link so a whole team starts from the same
configuration.

### 2 · `setup.R` (classic)

Prefer to scaffold interactively in RStudio? Drop [`setup.R`](setup.R) into an
empty project folder, open it, and run it. It prompts for the same options and
writes the structure in place (and can initialise `renv`).

## What you get

```
my-project/
├── my-project.Rproj      # open this in RStudio
├── R/
│   └── config.R          # paths, CRS, theme, set.seed() — sourced everywhere
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
- **Seeded** — `set.seed()` wired into `R/config.R`.
- **Numbered pipeline** — download → clean → model → visualize → report.
- **`targets` (optional)** — a DAG pipeline (`_targets.R`) that skips steps whose inputs haven't changed.
- **Makefile / `run.R`** — one command to reproduce every output.
- **Docker / Dev Containers (optional)** — pin the OS + R version, or get a one-click VS Code / Codespaces environment.
- **Optional CI** — a GitHub Action that runs the pipeline on push.
- **GitHub templates (optional)** — issue forms, PR template, Dependabot.
- Custom packages, config variables, and folders — extend beyond the built-in catalogue.

See the site's [**All options**](https://noahweidig.github.io/r-proj-template/#options)
section for the full list of toggles.

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
