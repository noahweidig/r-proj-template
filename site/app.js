/* =============================================================================
 *  R Project Scaffolder — client-side project generator
 *  Mirrors the output of setup.R, parameterized by the form. Builds a zip
 *  entirely in the browser (JSZip) — nothing is uploaded anywhere.
 * ========================================================================== */

"use strict";

/* ── package catalogue ────────────────────────────────────────────────── */
const PACKAGES = [
  { id: "here",      label: "here",      comment: "robust relative paths",   core: true  },
  { id: "tidyverse", label: "tidyverse", comment: "data wrangling & plotting", core: true },
  { id: "janitor",   label: "janitor",   comment: "column name cleaning",     core: true  },
  { id: "sf",        label: "sf",        comment: "vector spatial data",      spatial: true },
  { id: "terra",     label: "terra",     comment: "raster spatial data",      spatial: true },
  { id: "data.table",label: "data.table",comment: "fast tabular data" },
  { id: "lubridate", label: "lubridate", comment: "date/time handling" },
  { id: "glue",      label: "glue",      comment: "string interpolation" },
];

/* ── tiny helpers ─────────────────────────────────────────────────────── */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const slugify = (s) =>
  s.trim().toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "my-project";

const today = () => new Date().toISOString().slice(0, 10);
const year  = () => new Date().getFullYear();
const pad   = (s, n) => (s + " ".repeat(n)).slice(0, n);

/* ── read the form into a config object ──────────────────────────────── */
function readConfig() {
  const spatial = $("#spatial").checked;
  const chosen  = $$("#pkgGrid input:checked").map((i) => i.value);
  // keep catalogue order, drop spatial pkgs when not a spatial project
  const pkgs = PACKAGES.filter(
    (p) => chosen.includes(p.id) && (spatial || !p.spatial)
  );
  return {
    name:    $("#projName").value.trim(),
    slug:    slugify($("#projName").value || "my-project"),
    author:  $("#author").value.trim(),
    desc:    $("#description").value.trim(),
    spatial,
    pkgs,
    crsProj: $("#crsProj").value.trim() || "5070",
    crsGeo:  $("#crsGeo").value.trim()  || "4326",
    seed:    $("#seed").value.trim()    || "42",
    license: $("#license").value,
    renv:    $("#useRenv").checked,
    quarto:  $("#useQuarto").checked,
    make:    $("#useMakefile").checked,
    github:  $("#useGithub").checked,
    date:    today(),
  };
}

/* ── file generators (faithful to setup.R) ───────────────────────────── */

function genRproj() {
  return [
    "Version: 1.0", "",
    "RestoreWorkspace: No", "SaveWorkspace: No", "AlwaysSaveHistory: Default", "",
    "EnableCodeIndexing: Yes", "UseSpacesForTab: Yes", "NumSpacesForTab: 2", "Encoding: UTF-8", "",
    "RnwWeave: Sweave", "LaTeX: pdfLaTeX", "",
    "AutoAppendNewline: Yes", "StripTrailingWhitespace: Yes", "LineEndingConversion: Posix", "",
    "BuildType: None", "",
  ].join("\n");
}

function genConfig(c) {
  const L = [
    "# =============================================================================",
    "# config.R",
    `# Project:     ${c.name}`,
    "# Description: Universal project configuration — paths, constants, CRS, etc.",
    `# Author:      ${c.author}`,
    `# Date:        ${c.date}`,
    "# =============================================================================",
    "",
    "# Packages ----",
  ];
  const w = Math.max(...c.pkgs.map((p) => p.label.length), 1);
  c.pkgs.forEach((p) => L.push(`library(${pad(p.label + ")", w + 1)}  # ${p.comment}`));
  L.push(
    "",
    "# Paths ----",
    "PROJ_ROOT   <- here::here()",
    'DATA_RAW    <- here::here("01_data", "raw_data")',
    'DATA_CLEAN  <- here::here("01_data", "clean_data")',
    'SCRIPTS     <- here::here("02_scripts")',
    'OUT_FIGURES <- here::here("03_outputs", "figures")',
    'OUT_TABLES  <- here::here("03_outputs", "tables")',
    ""
  );
  if (c.spatial) {
    L.push(
      "# CRS ----",
      `CRS_GEO     <- ${c.crsGeo}   # geographic`,
      `CRS_PROJ    <- ${c.crsProj}   # projected — change as needed`,
      ""
    );
  }
  L.push(
    "# Visual theme ----",
    "theme_set(theme_minimal(base_size = 13))",
    "",
    "# Reproducibility ----",
    `set.seed(${c.seed})`,
    ""
  );
  return L.join("\n");
}

function rHeader(c, filename, description) {
  return [
    "# =============================================================================",
    `# ${filename}`,
    `# Project:     ${c.name}`,
    `# Description: ${description}`,
    `# Author:      ${c.author}`,
    `# Date:        ${c.date}`,
    "# =============================================================================",
    "",
    'source(here::here("config.R"))',
    "",
  ];
}

function genDownloadScript(c) {
  return rHeader(c, "01_download_data.R", "Download raw data from source(s) to 01_data/raw_data/").concat([
    "# Download ----",
    "",
    "# Example: download a file",
    '# url  <- "https://example.com/data.geojson"',
    '# dest <- file.path(DATA_RAW, "data.geojson")',
    '# if (!file.exists(dest)) download.file(url, dest, mode = "wb")',
    "",
  ]).join("\n");
}

function genCleanScript(c) {
  const read = c.spatial
    ? '# raw <- sf::st_read(file.path(DATA_RAW, "data.geojson"))'
    : '# raw <- readr::read_csv(file.path(DATA_RAW, "data.csv"))';
  const clean = c.spatial
    ? ["# clean <- raw |>", "#   janitor::clean_names() |>", "#   sf::st_transform(CRS_PROJ)"]
    : ["# clean <- raw |>", "#   janitor::clean_names()"];
  const write = c.spatial
    ? '# sf::st_write(clean, file.path(DATA_CLEAN, "data_clean.gpkg"), delete_dsn = TRUE)'
    : '# readr::write_csv(clean, file.path(DATA_CLEAN, "data_clean.csv"))';
  return rHeader(c, "02_clean_data.R", "Read raw data, clean/transform, write to 01_data/clean_data/").concat([
    "# Read ----", "", read, "",
    "# Clean ----", "", ...clean, "",
    "# Write ----", "", write, "",
  ]).join("\n");
}

function genModelScript(c) {
  const read = c.spatial
    ? '# clean <- sf::st_read(file.path(DATA_CLEAN, "data_clean.gpkg"))'
    : '# clean <- readr::read_csv(file.path(DATA_CLEAN, "data_clean.csv"))';
  return rHeader(c, "03_model_data.R", "Model / analyse cleaned data").concat([
    "# Read ----", "", read, "",
    "# Model ----", "", "# results <- lm(y ~ x, data = clean)", "# summary(results)", "",
    "# Save results ----", "", '# saveRDS(results, file.path(OUT_TABLES, "model_results.rds"))', "",
  ]).join("\n");
}

function genVizScript(c) {
  const read = c.spatial
    ? '# clean <- sf::st_read(file.path(DATA_CLEAN, "data_clean.gpkg"))'
    : '# clean <- readr::read_csv(file.path(DATA_CLEAN, "data_clean.csv"))';
  const plot = c.spatial
    ? ["# p <- ggplot(clean) +", "#   geom_sf(aes(fill = variable)) +",
       "#   scale_fill_viridis_c() +", '#   labs(title = "My Map", fill = "Value")']
    : ["# p <- ggplot(clean, aes(x = x, y = y)) +", "#   geom_point() +",
       '#   labs(title = "My Chart")'];
  const out = c.spatial ? "map.png" : "chart.png";
  return rHeader(c, "04_visualize_data.R", "Produce maps, charts, and figures → 03_outputs/figures/").concat([
    "library(ggplot2)", "",
    "# Read ----", "", read, "",
    "# Plot ----", "", ...plot, "",
    "# Save ----", "", `# ggsave(file.path(OUT_FIGURES, "${out}"), p, width = 10, height = 7, dpi = 300)`, "",
  ]).join("\n");
}

function genQmd(c) {
  return [
    "---",
    `title: "${c.name}"`,
    `author: "${c.author}"`,
    `date: "${c.date}"`,
    "format:",
    "  html:",
    "    toc: true",
    "    toc-depth: 3",
    "    code-fold: true",
    "    theme: cosmo",
    "  pdf:",
    "    toc: true",
    "execute:",
    "  echo: false",
    "  warning: false",
    "  message: false",
    "---",
    "",
    "```{r setup}",
    "#| include: false",
    'source(here::here("config.R"))',
    "```",
    "",
    "## Introduction",
    "",
    c.desc || "Describe your project here.",
    "",
    "## Data", "",
    "```{r load-data}",
    c.spatial
      ? '# clean <- sf::st_read(file.path(DATA_CLEAN, "data_clean.gpkg"))'
      : '# clean <- readr::read_csv(file.path(DATA_CLEAN, "data_clean.csv"))',
    "```",
    "",
    "## Results", "", "```{r results}", "# Your analysis output here", "```",
    "",
    "## Maps & Figures", "", "```{r figures}",
    '# knitr::include_graphics(file.path(OUT_FIGURES, "map.png"))', "```",
    "",
  ].join("\n");
}

function genReadme(c) {
  const tree = buildTree(c, c.slug);
  const L = [
    `# ${c.name}`, "",
    `> Created: ${c.date}  `,
    `> Author:  ${c.author}`, "",
    "## Overview", "",
    c.desc || "A short description of the project, its goals, and key outputs.", "",
    "## Project Structure", "", "```", ...tree, "```", "",
    "## Workflow", "", "Run scripts in numbered order:", "", "```r",
    'source("02_scripts/01_download_data.R")',
    'source("02_scripts/02_clean_data.R")',
    'source("02_scripts/03_model_data.R")',
    'source("02_scripts/04_visualize_data.R")',
  ];
  if (c.quarto) L.push("# Then render 05_report_data.qmd in RStudio or via quarto::quarto_render()");
  L.push("```", "", "## Requirements", "", "- R >= 4.2");
  if (c.quarto) L.push("- Quarto >= 1.3");
  if (c.renv)   L.push("- `renv` for package management (`renv::restore()` to install packages)");
  L.push("", "## License", "");
  L.push(c.license === "none" ? "Unlicensed." : `${c.license} — see [LICENSE](LICENSE)`, "");
  return L.join("\n");
}

/* ascii project tree (also used for the live preview) */
function buildTree(c, root) {
  const t = [root + "/"];
  const add = (line) => t.push(line);
  add(`├── ${c.slug}.Rproj          # RStudio project file (open this to launch)`);
  add("├── config.R                 # Universal config: paths, CRS, theme");
  add("├── README.md");
  if (c.license !== "none") add("├── LICENSE");
  if (c.renv) add("├── renv.lock                # pinned package versions");
  if (c.make) add("├── Makefile                 # run the pipeline with `make`");
  if (c.github) add("├── .gitignore");
  add("├── 01_data/");
  add("│   ├── raw_data/            # downloaded / original data (do not edit)");
  add("│   └── clean_data/          # processed data ready for analysis");
  add("├── 02_scripts/");
  add("│   ├── 01_download_data.R");
  add("│   ├── 02_clean_data.R");
  add("│   ├── 03_model_data.R");
  add(`│   ${c.quarto ? "├" : "└"}── 04_visualize_data.R`);
  if (c.quarto) add("│   └── 05_report_data.qmd");
  add("└── 03_outputs/");
  add("    ├── figures/");
  add("    └── tables/");
  return t;
}

function genLicense(c) {
  if (c.license === "none") return null;
  if (c.license === "MIT") {
    return [
      "MIT License", "",
      `Copyright (c) ${year()} ${c.author}`, "",
      "Permission is hereby granted, free of charge, to any person obtaining a copy",
      'of this software and associated documentation files (the "Software"), to deal',
      "in the Software without restriction, including without limitation the rights",
      "to use, copy, modify, merge, publish, distribute, sublicense, and/or sell",
      "copies of the Software, and to permit persons to whom the Software is",
      "furnished to do so, subject to the following conditions:", "",
      "The above copyright notice and this permission notice shall be included in all",
      "copies or substantial portions of the Software.", "",
      'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR',
      "IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,",
      "FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE",
      "AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER",
      "LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,",
      "OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE",
      "SOFTWARE.", "",
    ].join("\n");
  }
  // For Apache / GPL / CC, ship a pointer rather than a wrong full text.
  const url = {
    "Apache-2.0": "https://www.apache.org/licenses/LICENSE-2.0.txt",
    "GPL-3.0":    "https://www.gnu.org/licenses/gpl-3.0.txt",
    "CC-BY-4.0":  "https://creativecommons.org/licenses/by/4.0/legalcode.txt",
  }[c.license];
  return [
    `${c.license} License`, "",
    `Copyright (c) ${year()} ${c.author}`, "",
    `This project is licensed under the ${c.license} license.`,
    `Replace this file with the full license text from:`,
    `  ${url}`, "",
  ].join("\n");
}

function genMakefile(c) {
  const L = [
    "# ====================", "# Makefile",
    `# Project: ${c.name}`, `# Author:  ${c.author}`, `# Date:    ${c.date}`,
    "# ====================", "",
    "# Default target — run the full pipeline",
    ".PHONY: all clean download clean_data model visualize report restore snapshot help", "",
    `all: download clean_data model visualize${c.quarto ? " report" : ""}`, "",
    "# Run individual steps ----", "",
    "download:", "\tRscript -e 'source(\"02_scripts/01_download_data.R\")'", "",
    "clean_data:", "\tRscript -e 'source(\"02_scripts/02_clean_data.R\")'", "",
    "model:", "\tRscript -e 'source(\"02_scripts/03_model_data.R\")'", "",
    "visualize:", "\tRscript -e 'source(\"02_scripts/04_visualize_data.R\")'", "",
  ];
  if (c.quarto) L.push("report:", "\tquarto render 02_scripts/05_report_data.qmd", "");
  L.push(
    "# Helpers ----", "",
    "# Delete all outputs and cleaned data (raw data is preserved)",
    "clean:",
    "\tRscript -e 'unlink(\"01_data/clean_data/*\")'",
    "\tRscript -e 'unlink(\"03_outputs/figures/*\")'",
    "\tRscript -e 'unlink(\"03_outputs/tables/*\")'",
    "\t@echo \"Outputs cleared. Raw data preserved.\"", ""
  );
  if (c.renv) {
    L.push("restore:", "\tRscript -e 'renv::restore()'", "");
    L.push("snapshot:", "\tRscript -e 'renv::snapshot()'", "");
  }
  L.push(
    "help:", "\t@echo \"\"", `\t@echo \"  ${c.name}\"`, "\t@echo \"\"",
    "\t@echo \"  Targets:\"",
    "\t@echo \"    make all          Run the full pipeline\"",
    "\t@echo \"    make download     Download raw data\"",
    "\t@echo \"    make clean_data   Clean and process data\"",
    "\t@echo \"    make model        Run models\"",
    "\t@echo \"    make visualize    Generate figures\""
  );
  if (c.quarto) L.push("\t@echo \"    make report       Render Quarto report\"");
  L.push("\t@echo \"    make clean        Delete outputs (raw data preserved)\"");
  if (c.renv) {
    L.push("\t@echo \"    make restore      Restore renv packages\"");
    L.push("\t@echo \"    make snapshot     Snapshot renv packages\"");
  }
  L.push("\t@echo \"\"", "");
  return L.join("\n");
}

function genGitignore() {
  return [
    "# History files", ".Rhistory", ".Rapp.history", "",
    "# Session Data files", ".RData", ".RDataTmp", "",
    "# User-specific files", ".Ruserdata", "",
    "# RStudio files", ".Rproj.user/", "",
    "# knitr and R markdown caches", "*_cache/", "/cache/",
    "*.utf8.md", "*.knit.md", "",
    "# R Environment Variables", ".Renviron", "",
    "# Outputs (uncomment to keep generated artefacts out of git)",
    "# 03_outputs/figures/*", "# 03_outputs/tables/*", "",
    "# renv library (the lockfile is committed; the library is not)",
    "renv/library/", "renv/staging/", "",
  ].join("\n");
}

function genRenvReadme(c) {
  return [
    "# renv", "",
    "This project uses [renv](https://rstudio.github.io/renv/) to pin package",
    "versions for reproducibility.", "",
    "First time setup, run once in R from the project root:", "",
    "```r",
    'if (!requireNamespace("renv", quietly = TRUE)) install.packages("renv")',
    "renv::init()        # creates renv.lock from your installed packages",
    "```", "",
    "Collaborators then restore the exact environment with:", "",
    "```r", "renv::restore()", "```", "",
    "After installing or updating packages, capture them with `renv::snapshot()`.",
    "",
  ].join("\n");
}

function genCI(c) {
  return [
    "name: R-CMD", "",
    "on:",
    "  push:",
    "    branches: [main, master]",
    "  pull_request:", "",
    "jobs:",
    "  render:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - uses: actions/checkout@v4",
    "      - uses: r-lib/actions/setup-r@v2",
    "        with:",
    "          use-public-rspm: true",
  ].concat(
    c.renv
      ? ["      - uses: r-lib/actions/setup-renv@v2"]
      : ["      - uses: r-lib/actions/setup-r-dependencies@v2"]
  ).concat(
    c.quarto ? ["      - uses: quarto-dev/quarto-actions/setup@v2"] : []
  ).concat([
    "      - name: Run pipeline",
    "        run: |",
    '          Rscript -e \'source("02_scripts/02_clean_data.R")\'',
    "",
  ]).join("\n");
}

/* ── assemble the file map ───────────────────────────────────────────── */
function buildFiles(c) {
  const f = {};
  f[`${c.slug}.Rproj`] = genRproj();
  f["config.R"] = genConfig(c);
  f["README.md"] = genReadme(c);
  f["02_scripts/01_download_data.R"] = genDownloadScript(c);
  f["02_scripts/02_clean_data.R"] = genCleanScript(c);
  f["02_scripts/03_model_data.R"] = genModelScript(c);
  f["02_scripts/04_visualize_data.R"] = genVizScript(c);
  if (c.quarto) f["02_scripts/05_report_data.qmd"] = genQmd(c);
  // keep empty dirs in the zip
  f["01_data/raw_data/.gitkeep"] = "";
  f["01_data/clean_data/.gitkeep"] = "";
  f["03_outputs/figures/.gitkeep"] = "";
  f["03_outputs/tables/.gitkeep"] = "";
  const lic = genLicense(c);
  if (lic) f["LICENSE"] = lic;
  if (c.make) f["Makefile"] = genMakefile(c);
  if (c.renv) f["renv/README.md"] = genRenvReadme(c);
  if (c.github) {
    f[".gitignore"] = genGitignore();
    f[".github/workflows/ci.yml"] = genCI(c);
  }
  return f;
}

/* ── zip + download ──────────────────────────────────────────────────── */
async function downloadZip() {
  const c = readConfig();
  const err = validate(c);
  if (err) { showError(err); return; }
  showError("");

  const btn = $("#downloadBtn");
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = "Building…";

  try {
    const zip = new JSZip();
    const root = zip.folder(c.slug);
    const files = buildFiles(c);
    Object.entries(files).forEach(([path, content]) => root.file(path, content));
    const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
    saveAs(blob, `${c.slug}.zip`);
  } catch (e) {
    showError("Could not build the zip: " + e.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
}

function validate(c) {
  if (!c.name)   return "Please enter a project name.";
  if (!c.author) return "Please enter an author name.";
  if (c.pkgs.length === 0) return "Select at least one package.";
  return "";
}

function showError(msg) { $("#formError").textContent = msg; }

/* ── live preview ────────────────────────────────────────────────────── */
function refreshPreview() {
  const c = readConfig();
  $("#slugEcho").textContent = c.slug;
  $("#dlName").textContent = c.slug;
  $$(".nx-slug").forEach((el) => (el.textContent = c.slug));

  $("#treeView").textContent   = buildTree(c, c.slug).join("\n");
  $("#configView").textContent = genConfig(c);
  $("#readmeView").textContent = genReadme(c);
  $("#scriptView").textContent = genCleanScript(c);

  // show/hide CRS fieldset + renv step
  $("#crsFs").style.display = c.spatial ? "" : "none";
  $("#renvStep").style.display = c.renv ? "" : "none";

  // reflect chip on/off state
  $$("#pkgGrid .pkg").forEach((el) => {
    el.classList.toggle("is-on", el.querySelector("input").checked);
  });
}

/* ── build the package chips ─────────────────────────────────────────── */
function renderPackages() {
  const grid = $("#pkgGrid");
  grid.innerHTML = "";
  PACKAGES.forEach((p) => {
    const label = document.createElement("label");
    label.className = "pkg";
    const checked = p.core || p.spatial ? "checked" : "";
    label.innerHTML =
      `<input type="checkbox" value="${p.id}" ${checked} /><code>${p.label}</code>`;
    grid.appendChild(label);
  });
}

function syncSpatialPackages() {
  const on = $("#spatial").checked;
  PACKAGES.filter((p) => p.spatial).forEach((p) => {
    const input = $(`#pkgGrid input[value="${p.id}"]`);
    if (input) { input.checked = on; input.closest(".pkg").style.display = on ? "" : "flex"; }
  });
}

/* ── tabs ────────────────────────────────────────────────────────────── */
function initTabs() {
  $$(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$(".tab").forEach((t) => t.classList.remove("is-active"));
      $$(".tabpane").forEach((p) => p.classList.remove("is-active"));
      tab.classList.add("is-active");
      $(`.tabpane[data-pane="${tab.dataset.tab}"]`).classList.add("is-active");
    });
  });
}

/* ── theme ───────────────────────────────────────────────────────────── */
function initTheme() {
  const root = document.documentElement;
  const saved = localStorage.getItem("rps-theme");
  if (saved) root.dataset.theme = saved;
  const btn = $("#themeToggle");
  const sync = () => (btn.textContent = root.dataset.theme === "light" ? "☀️" : "🌙");
  sync();
  btn.addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
    localStorage.setItem("rps-theme", root.dataset.theme);
    sync();
  });
}

/* ── boot ────────────────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  renderPackages();
  initTabs();
  initTheme();

  $("#spatial").addEventListener("change", () => { syncSpatialPackages(); refreshPreview(); });
  $("#cfgForm").addEventListener("input", refreshPreview);
  $("#cfgForm").addEventListener("submit", (e) => { e.preventDefault(); downloadZip(); });
  $("#downloadBtn").addEventListener("click", downloadZip);

  refreshPreview();
});
