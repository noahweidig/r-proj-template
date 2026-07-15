# o4_docs — project context

This folder is a lightweight **context pack** for the R Project Template repo.
It captures the moving parts, the conventions, and the day-to-day workflow so a
new contributor (human or agent) can get oriented without reverse-engineering
the whole codebase.

## What lives here

| File | What it covers |
|------|----------------|
| [`architecture.md`](architecture.md) | The two entry points (`setup.R` + the web app) and how the pieces fit together. |
| [`workflow.md`](workflow.md) | How to develop, preview, and deploy the site; how releases reach GitHub Pages. |
| [`conventions.md`](conventions.md) | Rules the generators follow — parity between `setup.R` and `app.js`, package catalogue, file layout. |

## The one-paragraph version

This repo produces **reproducible R project scaffolds** two ways: a classic
interactive `setup.R` script, and a zero-install web app in [`site/`](../site/)
that builds the same project as a downloadable zip entirely in the browser. Both
generators must stay in sync — a change to the emitted project structure belongs
in *both* places. Generated projects keep universal configuration in
`R/config.R`, run a numbered `download → clean → model → visualize → report`
pipeline, and lean on the tidyverse (with `vroom` for fast file I/O).
