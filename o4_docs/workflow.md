# Development workflow

## Preview the site locally

The site is static — serve the folder and open it:

```bash
cd site
python3 -m http.server 8000   # then open http://localhost:8000
```

Edit `index.html` / `style.css` / `app.js` and refresh. There is no bundler,
transpiler, or install step.

## Make a change to the generated project

Most changes touch what the scaffolder *emits*. The workflow is:

1. Decide whether the change affects the emitted project (packages, files,
   structure, copy) or only the builder UI.
2. If it affects the emitted project, update **both** `site/app.js` **and**
   `setup.R` so the two generators stay in parity (see `conventions.md`).
3. Update user-facing copy in `index.html` (feature cards, the options table,
   the FAQ) and the root `README.md` if the structure or catalogue changed.
4. Sanity-check the JS: `node --check site/app.js`.
5. Preview locally and click **Download** to inspect the generated zip.

## Deploy

Push to `main`. `.github/workflows/deploy-pages.yml` deploys `site/` to GitHub
Pages automatically when the push touches `site/`. Enable Pages once under
**Settings → Pages → Source: GitHub Actions**.

## Quick checks before a PR

- [ ] `node --check site/app.js` passes.
- [ ] `setup.R` and `app.js` agree on the emitted structure.
- [ ] The live preview tree matches what the zip actually contains.
- [ ] Root `README.md` reflects any structural or catalogue changes.
