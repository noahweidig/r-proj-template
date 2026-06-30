/* =============================================================================
 *  R Project Scaffolder — client-side project generator
 *  Mirrors the output of setup.R, parameterized by the form. Builds a zip
 *  entirely in the browser (JSZip) — nothing is uploaded anywhere.
 * ========================================================================== */

"use strict";

/* ── package catalogue ────────────────────────────────────────────────────
 * Order matters: this is the order packages are written to config.R.
 * data.table is listed BEFORE tidyverse on purpose — loading data.table
 * first keeps function masking predictable and joins fast.
 * ----------------------------------------------------------------------- */
const PACKAGES = [
  { id: "here",      label: "here",      comment: "robust relative paths",      core: true  },
  { id: "data.table",label: "data.table",comment: "fast tabular data (load 1st)", core: true },
  { id: "tidyverse", label: "tidyverse", comment: "data wrangling & plotting",  core: true  },
  { id: "janitor",   label: "janitor",   comment: "column name cleaning",       core: true  },
  { id: "glue",      label: "glue",      comment: "string interpolation" },
  { id: "fs",        label: "fs",        comment: "tidy file-system ops" },
  { id: "conflicted",label: "conflicted",comment: "force explicit conflict choices" },
  { id: "sf",        label: "sf",        comment: "vector spatial data",        spatial: true },
  { id: "terra",     label: "terra",     comment: "raster spatial data",        spatial: true },
];

/* ── presets ─────────────────────────────────────────────────────────────
 * Each preset patches the form. Keys map to element ids; pkgs lists which
 * package chips to check (spatial pkgs are managed by the spatial toggle).
 * ----------------------------------------------------------------------- */
const PRESETS = {
  spatial: {
    spatial: true,
    numbering: "padded",
    pkgs: ["here", "data.table", "tidyverse", "janitor", "sf", "terra"],
    flags: { useRenv: true, useQuarto: true, useGithub: true, useRprofile: true,
             useDocker: false, useTestthat: false, useLintr: false,
             usePrecommit: false, useCitation: false, useDataDict: true,
             useContributing: false, useZenodo: false, useSessionInfo: true },
    runner: "make",
  },
  tabular: {
    spatial: false,
    numbering: "padded",
    pkgs: ["here", "data.table", "tidyverse", "janitor", "conflicted"],
    flags: { useRenv: true, useQuarto: true, useGithub: true, useRprofile: true,
             useDocker: false, useTestthat: true, useLintr: true,
             usePrecommit: false, useCitation: false, useDataDict: true,
             useContributing: false, useZenodo: false, useSessionInfo: true },
    runner: "make",
  },
  minimal: {
    spatial: false,
    numbering: "none",
    pkgs: ["here", "data.table"],
    flags: { useRenv: false, useQuarto: false, useGithub: false, useRprofile: false,
             useDocker: false, useTestthat: false, useLintr: false,
             usePrecommit: false, useCitation: false, useDataDict: false,
             useContributing: false, useZenodo: false, useSessionInfo: false },
    runner: "runr",
  },
  full: {
    spatial: false,
    numbering: "padded",
    pkgs: ["here", "data.table", "tidyverse", "janitor", "glue", "fs", "conflicted"],
    flags: { useRenv: true, useQuarto: true, useGithub: true, useRprofile: true,
             useDocker: true, useTestthat: true, useLintr: true,
             usePrecommit: true, useCitation: true, useDataDict: true,
             useContributing: true, useZenodo: true, useSessionInfo: true },
    runner: "both",
  },
};

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

/* ── numbering helpers ───────────────────────────────────────────────── */
function numPrefix(n, style) {
  switch (style) {
    case "plain": return n + "_";
    case "alpha": return String.fromCharCode(96 + n) + "_";
    case "upper": return String.fromCharCode(64 + n) + "_";
    case "none":  return "";
    default:      return String(n).padStart(2, "0") + "_"; // "padded"
  }
}

function projDirs(c) {
  const p = (n) => numPrefix(n, c.numbering);
  return { data: p(1) + "data", scripts: p(2) + "scripts", outputs: p(3) + "outputs" };
}

function scriptNames(c) {
  const p = (n) => numPrefix(n, c.numbering);
  return {
    dl:  p(1) + "download_data.R",
    cl:  p(2) + "clean_data.R",
    mod: p(3) + "model_data.R",
    viz: p(4) + "visualize_data.R",
    rpt: p(5) + "report_data.qmd",
  };
}

/* ── custom var / folder row builders ───────────────────────────────── */
function addVarRow(name = "", value = "", comment = "") {
  const row = document.createElement("div");
  row.className = "custom-row";
  row.innerHTML =
    `<input type="text" class="cv-name"  placeholder="VAR_NAME" value="${name.replace(/"/g,'&quot;')}" />` +
    `<input type="text" class="cv-value" placeholder="value or &quot;string&quot;" value="${value.replace(/"/g,'&quot;')}" />` +
    `<input type="text" class="cv-comment" placeholder="comment (optional)" value="${comment.replace(/"/g,'&quot;')}" />` +
    `<button type="button" class="remove-btn" aria-label="Remove row">✕</button>`;
  row.querySelector(".remove-btn").addEventListener("click", () => { row.remove(); refreshPreview(); });
  row.querySelectorAll("input").forEach((i) => i.addEventListener("input", refreshPreview));
  document.getElementById("customVarList").appendChild(row);
}

function addFolderRow(path = "") {
  const row = document.createElement("div");
  row.className = "custom-row";
  row.innerHTML =
    `<input type="text" class="cf-path" placeholder="04_docs/notes" value="${path.replace(/"/g,'&quot;')}" />` +
    `<button type="button" class="remove-btn" aria-label="Remove row">✕</button>`;
  row.querySelector(".remove-btn").addEventListener("click", () => { row.remove(); refreshPreview(); });
  row.querySelector("input").addEventListener("input", refreshPreview);
  document.getElementById("customFolderList").appendChild(row);
}

function readCustomVars() {
  return $$(".custom-row", document.getElementById("customVarList"))
    .map((r) => ({
      name:    r.querySelector(".cv-name").value.trim(),
      value:   r.querySelector(".cv-value").value.trim(),
      comment: r.querySelector(".cv-comment").value.trim(),
    }))
    .filter((v) => v.name);
}

function readCustomFolders() {
  return $$(".custom-row", document.getElementById("customFolderList"))
    .map((r) => r.querySelector(".cf-path").value.trim())
    .filter(Boolean);
}

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
    email:   $("#email").value.trim(),
    orcid:   $("#orcid").value.trim(),
    desc:    $("#description").value.trim(),
    spatial,
    pkgs,
    crsProj: $("#crsProj").value.trim() || "5070",
    crsGeo:  $("#crsGeo").value.trim()  || "4326",
    seed:    $("#seed").value.trim()    || "42",
    rver:    $("#rversion").value.trim() || "4.3",
    license: $("#license").value,
    runner:    $("#runner").value,
    numbering: $("#numbering").value,
    quartoFmt: $("#quartoFmt").value,
    renv:    $("#useRenv").checked,
    quarto:  $("#useQuarto").checked,
    github:  $("#useGithub").checked,
    rprofile:$("#useRprofile").checked,
    docker:  $("#useDocker").checked,
    testthat:$("#useTestthat").checked,
    lintr:   $("#useLintr").checked,
    precommit:$("#usePrecommit").checked,
    citation:$("#useCitation").checked,
    datadict:$("#useDataDict").checked,
    contributing:$("#useContributing").checked,
    zenodo:  $("#useZenodo").checked,
    sessioninfo:$("#useSessionInfo").checked,
    date:       today(),
    customVars:    readCustomVars(),
    customFolders: readCustomFolders(),
  };
}

const useMake = (c) => c.runner === "make" || c.runner === "both";
const useRunR = (c) => c.runner === "runr" || c.runner === "both";

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
    "# Load order matters: data.table is loaded before tidyverse so that",
    "# masking is predictable (dplyr verbs win) and data.table stays fast.",
  ];
  const w = Math.max(...c.pkgs.map((p) => p.label.length), 1);
  c.pkgs.forEach((p) => L.push(`library(${pad(p.label + ")", w + 1)}  # ${p.comment}`));

  const hasConflicted = c.pkgs.some((p) => p.id === "conflicted");
  const hasTidy = c.pkgs.some((p) => p.id === "tidyverse");
  const hasDT   = c.pkgs.some((p) => p.id === "data.table");
  if (hasConflicted) {
    L.push(
      "",
      "# Conflicts ----",
      "# Make every ambiguous function call explicit. Edit / extend as needed."
    );
    if (hasTidy) {
      L.push(
        'conflicts_prefer(dplyr::filter)',
        'conflicts_prefer(dplyr::lag)',
        'conflicts_prefer(dplyr::select)'
      );
      if (hasDT) {
        L.push(
          'conflicts_prefer(dplyr::between)',
          'conflicts_prefer(dplyr::first)',
          'conflicts_prefer(dplyr::last)'
        );
      }
    } else {
      L.push("# e.g. conflicts_prefer(data.table::first)");
    }
  }
  const d = projDirs(c);
  L.push(
    "",
    "# Paths ----",
    "PROJ_ROOT   <- here::here()",
    `DATA_RAW    <- here::here("${d.data}", "raw_data")`,
    `DATA_CLEAN  <- here::here("${d.data}", "clean_data")`,
    `SCRIPTS     <- here::here("${d.scripts}")`,
    `OUT_FIGURES <- here::here("${d.outputs}", "figures")`,
    `OUT_TABLES  <- here::here("${d.outputs}", "tables")`,
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
  if (c.customVars && c.customVars.length > 0) {
    L.push("# Custom ----");
    const nw = Math.max(...c.customVars.map((v) => v.name.length), 1);
    c.customVars.forEach((v) => {
      const line = `${pad(v.name, nw)} <- ${v.value}`;
      L.push(v.comment ? `${line}  # ${v.comment}` : line);
    });
    L.push("");
  }
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
  const s = scriptNames(c), d = projDirs(c);
  return rHeader(c, s.dl, `Download raw data from source(s) to ${d.data}/raw_data/`).concat([
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
  const s = scriptNames(c), d = projDirs(c);
  const read = c.spatial
    ? '# raw <- st_read(file.path(DATA_RAW, "data.geojson"))'
    : '# raw <- fread(file.path(DATA_RAW, "data.csv"))';
  const clean = c.spatial
    ? ["# clean <- raw |>", "#   clean_names() |>", "#   st_transform(CRS_PROJ)"]
    : ["# clean <- raw |>", "#   clean_names()"];
  const write = c.spatial
    ? '# st_write(clean, file.path(DATA_CLEAN, "data_clean.gpkg"), delete_dsn = TRUE)'
    : '# fwrite(clean, file.path(DATA_CLEAN, "data_clean.csv"))';
  return rHeader(c, s.cl, `Read raw data, clean/transform, write to ${d.data}/clean_data/`).concat([
    "# Read ----", "", read, "",
    "# Clean ----", "", ...clean, "",
    "# Write ----", "", write, "",
  ]).join("\n");
}

function genModelScript(c) {
  const s = scriptNames(c);
  const read = c.spatial
    ? '# clean <- st_read(file.path(DATA_CLEAN, "data_clean.gpkg"))'
    : '# clean <- fread(file.path(DATA_CLEAN, "data_clean.csv"))';
  return rHeader(c, s.mod, "Model / analyse cleaned data").concat([
    "# Read ----", "", read, "",
    "# Model ----", "", "# results <- lm(y ~ x, data = clean)", "# summary(results)", "",
    "# Save results ----", "", '# saveRDS(results, file.path(OUT_TABLES, "model_results.rds"))', "",
  ]).join("\n");
}

function genVizScript(c) {
  const s = scriptNames(c), d = projDirs(c);
  const read = c.spatial
    ? '# clean <- st_read(file.path(DATA_CLEAN, "data_clean.gpkg"))'
    : '# clean <- fread(file.path(DATA_CLEAN, "data_clean.csv"))';
  const plot = c.spatial
    ? ["# p <- ggplot(clean) +", "#   geom_sf(aes(fill = variable)) +",
       "#   scale_fill_viridis_c() +", '#   labs(title = "My Map", fill = "Value")']
    : ["# p <- ggplot(clean, aes(x = x, y = y)) +", "#   geom_point() +",
       '#   labs(title = "My Chart")'];
  const out = c.spatial ? "map.png" : "chart.png";
  return rHeader(c, s.viz, `Produce maps, charts, and figures → ${d.outputs}/figures/`).concat([
    "library(ggplot2)", "",
    "# Read ----", "", read, "",
    "# Plot ----", "", ...plot, "",
    "# Save ----", "", `# ggsave(file.path(OUT_FIGURES, "${out}"), p, width = 10, height = 7, dpi = 300)`, "",
  ]).join("\n");
}

function qmdFormatBlock(fmt) {
  const html = ["  html:", "    toc: true", "    toc-depth: 3", "    code-fold: true", "    theme: cosmo"];
  const pdf  = ["  pdf:", "    toc: true"];
  const docx = ["  docx:", "    toc: true"];
  switch (fmt) {
    case "pdf":  return ["format:", ...pdf];
    case "docx": return ["format:", ...docx];
    case "both": return ["format:", ...html, ...pdf];
    default:     return ["format:", ...html]; // html
  }
}

function genQmd(c) {
  return [
    "---",
    `title: "${c.name}"`,
    `author: "${c.author}"`,
    `date: "${c.date}"`,
    ...qmdFormatBlock(c.quartoFmt),
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
      ? '# clean <- st_read(file.path(DATA_CLEAN, "data_clean.gpkg"))'
      : '# clean <- fread(file.path(DATA_CLEAN, "data_clean.csv"))',
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
  const badges = [];
  badges.push("![R](https://img.shields.io/badge/R-%E2%89%A5" + c.rver + "-276DC3?logo=r&logoColor=white)");
  if (c.renv)   badges.push("![renv](https://img.shields.io/badge/reproducible-renv-2C8E5A)");
  if (c.docker) badges.push("![Docker](https://img.shields.io/badge/container-Docker-2496ED?logo=docker&logoColor=white)");
  if (c.license !== "none") badges.push(`![License](https://img.shields.io/badge/license-${encodeURIComponent(c.license)}-blue)`);

  const L = [
    `# ${c.name}`, "",
    badges.join(" "), "",
    `> Created: ${c.date}  `,
    `> Author:  ${c.author}${c.email ? ` <${c.email}>` : ""}`,
  ];
  if (c.orcid) L.push(`> ORCID:   ${c.orcid}`);
  L.push(
    "",
    "## Overview", "",
    c.desc || "A short description of the project, its goals, and key outputs.", "",
    "## Project Structure", "", "```", ...tree, "```", "",
    "## Workflow", "", "Run scripts in numbered order:", ""
  );
  if (useMake(c)) {
    L.push("```sh", "make all          # run the whole pipeline", "```", "");
  }
  const rd = projDirs(c), rn = scriptNames(c);
  L.push("Or from R:", "", "```r",
    `source("${rd.scripts}/${rn.dl}")`,
    `source("${rd.scripts}/${rn.cl}")`,
    `source("${rd.scripts}/${rn.mod}")`,
    `source("${rd.scripts}/${rn.viz}")`);
  if (c.quarto) L.push(`# Then render ${rn.rpt} in RStudio or via quarto::quarto_render()`);
  L.push("```", "");
  if (useRunR(c)) L.push("Or run everything at once:", "", "```sh", "Rscript run.R", "```", "");
  if (c.docker) {
    L.push("## Docker", "",
      "Build and run the whole project in a pinned container:", "",
      "```sh",
      `docker build -t ${c.slug} .`,
      `docker run --rm -v "$(pwd)":/project ${c.slug} make all`,
      "```", "");
  }
  L.push("## Requirements", "", `- R >= ${c.rver}`);
  if (c.quarto) L.push("- Quarto >= 1.3");
  if (c.renv)   L.push("- `renv` for package management (`renv::restore()` to install packages)");
  if (c.docker) L.push("- Docker (optional, for the containerised workflow)");
  L.push("", "## License", "");
  L.push(c.license === "none" ? "Unlicensed." : `${c.license} — see [LICENSE](LICENSE)`, "");
  return L.join("\n");
}

/* ascii project tree (also used for the live preview) */
function buildTree(c, root) {
  const t = [root + "/"];
  const add = (line) => t.push(line);
  const td = projDirs(c), tn = scriptNames(c);
  add(`├── ${c.slug}.Rproj          # RStudio project file (open this to launch)`);
  add("├── config.R                 # Universal config: paths, CRS, theme");
  add("├── README.md");
  if (c.license !== "none") add("├── LICENSE");
  if (c.contributing) { add("├── CONTRIBUTING.md          # how to contribute"); add("├── CODE_OF_CONDUCT.md"); }
  if (c.citation) add("├── CITATION.cff             # how to cite this work");
  if (c.zenodo) add("├── .zenodo.json             # archival metadata for a DOI");
  if (c.renv) add("├── renv.lock                # pinned package versions");
  if (c.rprofile) { add("├── .Rprofile                # session defaults / renv autoload"); add("├── .Renviron                # environment variables (template)"); }
  if (useMake(c)) add("├── Makefile                 # run the pipeline with `make`");
  if (useRunR(c)) add("├── run.R                    # run the whole pipeline with one Rscript");
  if (c.docker) add("├── Dockerfile               # pinned rocker image");
  if (c.lintr) { add("├── .lintr                   # lintr rules"); add("├── .editorconfig            # editor whitespace rules"); }
  if (c.precommit) add("├── .pre-commit-config.yaml  # git pre-commit hooks");
  if (c.github) add("├── .gitignore");
  add(`├── ${td.data}/`);
  if (c.datadict) {
    add("│   ├── README.md            # what lives where + data dictionary");
    add("│   ├── data_dictionary.csv");
  }
  add("│   ├── raw_data/            # downloaded / original data (do not edit)");
  add("│   └── clean_data/          # processed data ready for analysis");
  add(`├── ${td.scripts}/`);
  add(`│   ├── ${tn.dl}`);
  add(`│   ├── ${tn.cl}`);
  add(`│   ├── ${tn.mod}`);
  add(`│   ${c.quarto ? "├" : "└"}── ${tn.viz}`);
  if (c.quarto) add(`│   └── ${tn.rpt}`);
  if (c.testthat) {
    add("├── tests/");
    add("│   ├── testthat.R");
    add("│   └── testthat/");
    add("│       └── test-clean.R");
  }
  const hasCF = c.customFolders && c.customFolders.length > 0;
  add(`${hasCF ? "├" : "└"}── ${td.outputs}/`);
  add("    ├── figures/");
  add("    └── tables/");
  if (hasCF) {
    c.customFolders.forEach((p, i) => {
      const last = i === c.customFolders.length - 1;
      add(`${last ? "└" : "├"}── ${p}/`);
    });
  }
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
  const md = projDirs(c), mn = scriptNames(c);
  const L = [
    "# ====================", "# Makefile",
    `# Project: ${c.name}`, `# Author:  ${c.author}`, `# Date:    ${c.date}`,
    "# ====================", "",
    "# Default target — run the full pipeline",
    `.PHONY: all clean download clean_data model visualize${c.quarto ? " report" : ""}${c.testthat ? " test" : ""}${c.lintr ? " lint style" : ""}${c.renv ? " restore snapshot" : ""}${c.sessioninfo ? " session" : ""} help`, "",
    `all: download clean_data model visualize${c.quarto ? " report" : ""}${c.sessioninfo ? " session" : ""}`, "",
    "# Run individual steps ----", "",
    "download:", `\tRscript -e 'source("${md.scripts}/${mn.dl}")'`, "",
    "clean_data:", `\tRscript -e 'source("${md.scripts}/${mn.cl}")'`, "",
    "model:", `\tRscript -e 'source("${md.scripts}/${mn.mod}")'`, "",
    "visualize:", `\tRscript -e 'source("${md.scripts}/${mn.viz}")'`, "",
  ];
  if (c.quarto) L.push("report:", `\tquarto render ${md.scripts}/${mn.rpt}`, "");
  if (c.testthat) L.push("test:", "\tRscript -e 'testthat::test_dir(\"tests/testthat\")'", "");
  if (c.lintr) {
    L.push("lint:", `\tRscript -e 'lintr::lint_dir("${md.scripts}")'`, "");
    L.push("style:", `\tRscript -e 'styler::style_dir("${md.scripts}")'`, "");
  }
  L.push(
    "# Helpers ----", "",
    "# Delete all outputs and cleaned data (raw data is preserved)",
    "clean:",
    `\tRscript -e 'unlink("${md.data}/clean_data/*")'`,
    `\tRscript -e 'unlink("${md.outputs}/figures/*")'`,
    `\tRscript -e 'unlink("${md.outputs}/tables/*")'`,
    "\t@echo \"Outputs cleared. Raw data preserved.\"", ""
  );
  if (c.renv) {
    L.push("restore:", "\tRscript -e 'renv::restore()'", "");
    L.push("snapshot:", "\tRscript -e 'renv::snapshot()'", "");
  }
  if (c.sessioninfo) {
    L.push("session:",
      "\tRscript -e 'writeLines(capture.output(sessionInfo()), \"session-info.txt\")'", "");
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
  if (c.testthat) L.push("\t@echo \"    make test         Run testthat tests\"");
  if (c.lintr) {
    L.push("\t@echo \"    make lint         Lint scripts\"");
    L.push("\t@echo \"    make style        Auto-format scripts\"");
  }
  L.push("\t@echo \"    make clean        Delete outputs (raw data preserved)\"");
  if (c.sessioninfo) L.push("\t@echo \"    make session      Write session-info.txt\"");
  if (c.renv) {
    L.push("\t@echo \"    make restore      Restore renv packages\"");
    L.push("\t@echo \"    make snapshot     Snapshot renv packages\"");
  }
  L.push("\t@echo \"\"", "");
  return L.join("\n");
}

function genRunR(c) {
  const L = [
    "# =============================================================================",
    "# run.R",
    `# Project:     ${c.name}`,
    "# Description: Run the whole pipeline end-to-end with a single Rscript run.R",
    `# Author:      ${c.author}`,
    `# Date:        ${c.date}`,
    "# =============================================================================",
    "",
  ];
  const rrd = projDirs(c), rrn = scriptNames(c);
  L.push(
    "steps <- c(",
    `  "${rrd.scripts}/${rrn.dl}",`,
    `  "${rrd.scripts}/${rrn.cl}",`,
    `  "${rrd.scripts}/${rrn.mod}",`,
    `  "${rrd.scripts}/${rrn.viz}"`,
    ")",
    "",
    "for (s in steps) {",
    '  message("\\n==> ", s)',
    "  source(here::here(s))",
    "}",
    "",
  );
  if (c.quarto) L.push(`quarto::quarto_render(here::here("${rrd.scripts}/${rrn.rpt}"))`, "");
  if (c.sessioninfo) {
    L.push(
      "# Capture the exact environment this run used (reproducibility log)",
      'writeLines(capture.output(sessionInfo()), here::here("session-info.txt"))',
      ""
    );
  }
  L.push('message("\\n[done] pipeline complete.")', "");
  return L.join("\n");
}

function genGitignore(c) {
  const gd = projDirs(c);
  const L = [
    "# History files", ".Rhistory", ".Rapp.history", "",
    ...(c.sessioninfo ? ["# Per-run reproducibility log", "session-info.txt", ""] : []),
    "# Session Data files", ".RData", ".RDataTmp", "",
    "# User-specific files", ".Ruserdata", "",
    "# RStudio files", ".Rproj.user/", "",
    "# knitr and R markdown caches", "*_cache/", "/cache/",
    "*.utf8.md", "*.knit.md", "",
    "# Quarto", "/.quarto/", "*_files/", "",
    "# R Environment Variables (keep template, ignore real secrets)", ".Renviron.local", "",
    "# Outputs (uncomment to keep generated artefacts out of git)",
    `# ${gd.outputs}/figures/*`, `# ${gd.outputs}/tables/*`, "",
    "# renv library (the lockfile is committed; the library is not)",
    "renv/library/", "renv/staging/", "",
  ];
  return L.join("\n");
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

function genRprofile(c) {
  const L = [
    "# .Rprofile — sourced at the start of every R session in this project.",
    "",
    "# Quieter, friendlier defaults",
    "options(",
    "  stringsAsFactors = FALSE,",
    "  scipen = 999,",
    '  warnPartialMatchArgs = TRUE,',
    '  repos = c(CRAN = "https://cloud.r-project.org")',
    ")",
    "",
  ];
  if (c.renv) {
    L.push(
      "# Activate renv if present",
      'if (file.exists("renv/activate.R")) source("renv/activate.R")',
      ""
    );
  }
  L.push(
    'if (interactive()) {',
    `  message("Project: ${c.name}  |  R ", getRversion())`,
    "}",
    ""
  );
  return L.join("\n");
}

function genRenviron(c) {
  return [
    "# .Renviron — environment variables for this project.",
    "# Do NOT commit real secrets. Put real values in .Renviron.local",
    "# (gitignored) or your system environment.",
    "",
    "# Example:",
    "# DATA_API_KEY=replace-me",
    "# AWS_DEFAULT_REGION=us-east-1",
    "",
    "# Use more cores for data.table by default (0 = all available)",
    "# R_DATATABLE_NUM_THREADS=0",
    "",
  ].join("\n");
}

function genDockerfile(c) {
  const L = [
    `# Pinned, reproducible image for ${c.name}`,
    `FROM rocker/r-ver:${c.rver}`,
    "",
    "# System libraries commonly needed by R spatial / build tooling",
    "RUN apt-get update && apt-get install -y --no-install-recommends \\",
    "    make \\",
  ];
  if (c.spatial) {
    L.push(
      "    gdal-bin libgdal-dev \\",
      "    libgeos-dev libproj-dev libudunits2-dev \\"
    );
  }
  L.push(
    "    && rm -rf /var/lib/apt/lists/*",
    "",
    "WORKDIR /project",
    ""
  );
  if (c.renv) {
    L.push(
      "# Restore the exact package versions from the lockfile",
      'RUN R -e "install.packages(\'renv\', repos = \'https://cloud.r-project.org\')"',
      "COPY renv.lock renv.lock",
      'RUN R -e "renv::restore()"',
      ""
    );
  } else {
    const ids = c.pkgs.map((p) => `'${p.label}'`).join(", ");
    L.push(
      "# Install packages directly (no renv lockfile)",
      `RUN R -e "install.packages(c(${ids}), repos = 'https://cloud.r-project.org')"`,
      ""
    );
  }
  L.push(
    "COPY . .",
    "",
    `CMD ["${useMake(c) ? "make" : "Rscript"}", "${useMake(c) ? "all" : "run.R"}"]`,
    ""
  );
  return L.join("\n");
}

function genTestthatRunner() {
  return [
    "library(testthat)",
    "",
    'test_dir("tests/testthat")',
    "",
  ].join("\n");
}

function genTestthatTest(c) {
  return [
    "# Tests for the cleaning step.",
    "# Run with: testthat::test_dir(\"tests/testthat\")  or  make test",
    "",
    'test_that("cleaned data has no duplicate rows", {',
    "  # clean <- " + (c.spatial
      ? 'st_read(file.path(DATA_CLEAN, "data_clean.gpkg"))'
      : 'fread(file.path(DATA_CLEAN, "data_clean.csv"))') + "",
    "  # expect_equal(anyDuplicated(clean), 0)",
    "  expect_true(TRUE)  # replace with a real assertion",
    "})",
    "",
  ].join("\n");
}

function genLintr() {
  return [
    "linters: linters_with_defaults(",
    "    line_length_linter(100),",
    "    object_name_linter(c(\"snake_case\", \"symbols\")),",
    "    commented_code_linter = NULL",
    "  )",
    "encoding: \"UTF-8\"",
    "",
  ].join("\n");
}

function genEditorconfig() {
  return [
    "root = true",
    "",
    "[*]",
    "charset = utf-8",
    "end_of_line = lf",
    "insert_final_newline = true",
    "trim_trailing_whitespace = true",
    "indent_style = space",
    "indent_size = 2",
    "",
    "[Makefile]",
    "indent_style = tab",
    "",
  ].join("\n");
}

function genPrecommit(c) {
  const L = [
    "# See https://lorenzwalthert.github.io/precommit/ for the R hooks.",
    "# Install once:  R -e 'precommit::use_precommit()'",
    "repos:",
    "  - repo: https://github.com/lorenzwalthert/precommit",
    "    rev: v0.4.3",
    "    hooks:",
  ];
  if (c.lintr) L.push("      - id: lintr");
  L.push(
    "      - id: style-files",
    "      - id: no-browser-statement",
    "      - id: parsable-R",
    "  - repo: https://github.com/pre-commit/pre-commit-hooks",
    "    rev: v4.6.0",
    "    hooks:",
    "      - id: end-of-file-fixer",
    "      - id: trailing-whitespace",
    "      - id: check-added-large-files",
    "",
  );
  return L.join("\n");
}

function genCitation(c) {
  const L = [
    "cff-version: 1.2.0",
    'message: "If you use this project, please cite it as below."',
    `title: "${c.name}"`,
    "type: software",
    "authors:",
  ];
  // best-effort split of "First Last"
  const parts = c.author.split(/\s+/);
  const family = parts.length > 1 ? parts.pop() : c.author;
  const given  = parts.join(" ") || c.author;
  L.push(`  - given-names: "${given}"`);
  if (parts.length > 0) L.push(`    family-names: "${family}"`);
  if (c.email) L.push(`    email: "${c.email}"`);
  if (c.orcid) L.push(`    orcid: "https://orcid.org/${c.orcid}"`);
  L.push(`date-released: "${c.date}"`);
  if (c.license !== "none") L.push(`license: ${c.license}`);
  if (c.desc) L.push(`abstract: "${c.desc.replace(/"/g, "'")}"`);
  L.push("");
  return L.join("\n");
}

function genDataDictCsv() {
  return [
    "file,variable,type,units,description",
    "data_clean.csv,id,integer,,unique record identifier",
    "data_clean.csv,date,date,YYYY-MM-DD,observation date",
    "data_clean.csv,value,double,,measured value",
    "",
  ].join("\n");
}

function genDataReadme(c) {
  return [
    "# Data", "",
    "| Folder | Contents | Editable? |",
    "|--------|----------|-----------|",
    "| `raw_data/`   | Original, downloaded data | **Never edit by hand** |",
    "| `clean_data/` | Processed, analysis-ready data | Regenerated by scripts |",
    "",
    "See [`data_dictionary.csv`](data_dictionary.csv) for the meaning, type, and",
    "units of every variable in the cleaned data.",
    "",
    "## Provenance", "",
    "- Source(s): _describe where the raw data came from_",
    "- Retrieved: _date / script_",
    "- License / terms of use: _note any restrictions_",
    "",
  ].join("\n");
}

function genCI(c) {
  const cid = projDirs(c), cin = scriptNames(c);
  const steps = [
    "name: pipeline", "",
    "on:",
    "  push:",
    "    branches: [main, master]",
    "  pull_request:", "",
    "jobs:",
    "  run:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - uses: actions/checkout@v4",
    "      - uses: r-lib/actions/setup-r@v2",
    "        with:",
    "          use-public-rspm: true",
  ];
  steps.push(
    c.renv
      ? "      - uses: r-lib/actions/setup-renv@v2"
      : "      - uses: r-lib/actions/setup-r-dependencies@v2"
  );
  if (c.quarto) steps.push("      - uses: quarto-dev/quarto-actions/setup@v2");
  if (c.lintr) {
    steps.push(
      "      - name: Lint",
      `        run: Rscript -e 'lintr::lint_dir("${cid.scripts}")'`
    );
  }
  if (c.testthat) {
    steps.push(
      "      - name: Test",
      "        run: Rscript -e 'testthat::test_dir(\"tests/testthat\")'"
    );
  }
  steps.push(
    "      - name: Run pipeline",
    "        run: |",
    `          Rscript -e 'source("${cid.scripts}/${cin.cl}")'`,
    ""
  );
  return steps.join("\n");
}

function genContributing(c) {
  const rd = projDirs(c);
  const L = [
    `# Contributing to ${c.name}`, "",
    "Thanks for taking the time to contribute! 🎉", "",
    "## Ground rules", "",
    "- Be respectful — this project follows the",
    "  [Contributor Covenant](CODE_OF_CONDUCT.md).",
    "- Open an issue before large changes so we can discuss the approach.",
    "", "## Getting set up", "", "```r",
  ];
  if (c.renv) L.push("renv::restore()   # install the pinned package versions");
  else        L.push('# install.packages(c(...))  # see config.R for required packages');
  L.push("```", "", "## Workflow", "",
    `Scripts live in \`${rd.scripts}/\` and run in numbered order — keep that order intact.`,
    "Raw data is never edited by hand; regenerate cleaned data from the scripts.", "");
  if (c.lintr)    L.push("Run `make style` and `make lint` before opening a pull request.", "");
  if (c.testthat) L.push("Make sure `make test` passes before opening a pull request.", "");
  L.push("## Pull requests", "",
    "1. Fork & branch from `main`.",
    "2. Make focused commits with clear messages.",
    "3. Open a pull request describing **what** changed and **why**.", "");
  return L.join("\n");
}

function genCodeOfConduct(c) {
  const contact = c.email || "the project maintainers";
  return [
    "# Contributor Covenant Code of Conduct", "",
    "## Our Pledge", "",
    "We as members, contributors, and leaders pledge to make participation in our",
    "community a harassment-free experience for everyone, regardless of age, body",
    "size, visible or invisible disability, ethnicity, sex characteristics, gender",
    "identity and expression, level of experience, education, socio-economic status,",
    "nationality, personal appearance, race, religion, or sexual identity and",
    "orientation.", "",
    "## Our Standards", "",
    "Examples of behavior that contributes to a positive environment include being",
    "respectful, giving and gracefully accepting constructive feedback, and focusing",
    "on what is best for the community.", "",
    "## Enforcement", "",
    `Instances of abusive or otherwise unacceptable behavior may be reported to ${contact}.`,
    "All complaints will be reviewed and investigated promptly and fairly.", "",
    "This Code of Conduct is adapted from the [Contributor Covenant][cc], version 2.1.", "",
    "[cc]: https://www.contributor-covenant.org/version/2/1/code_of_conduct.html",
    "",
  ].join("\n");
}

function genZenodo(c) {
  const parts = c.author.split(/\s+/);
  const family = parts.length > 1 ? parts.pop() : c.author;
  const given  = parts.join(" ");
  const name   = given ? `${family}, ${given}` : c.author;
  const licMap = { "MIT": "MIT", "Apache-2.0": "Apache-2.0", "GPL-3.0": "GPL-3.0-only", "CC-BY-4.0": "CC-BY-4.0" };
  const creator = { name };
  if (c.orcid) creator.orcid = c.orcid;
  const obj = {
    title: c.name,
    description: c.desc || "A reproducible R research project.",
    upload_type: "software",
    creators: [creator],
  };
  if (c.license !== "none" && licMap[c.license]) obj.license = licMap[c.license];
  return JSON.stringify(obj, null, 2) + "\n";
}

/* ── assemble the file map ───────────────────────────────────────────── */
function buildFiles(c) {
  const f = {};
  const fd = projDirs(c), fn = scriptNames(c);
  f[`${c.slug}.Rproj`] = genRproj();
  f["config.R"] = genConfig(c);
  f["README.md"] = genReadme(c);
  f[`${fd.scripts}/${fn.dl}`] = genDownloadScript(c);
  f[`${fd.scripts}/${fn.cl}`] = genCleanScript(c);
  f[`${fd.scripts}/${fn.mod}`] = genModelScript(c);
  f[`${fd.scripts}/${fn.viz}`] = genVizScript(c);
  if (c.quarto) f[`${fd.scripts}/${fn.rpt}`] = genQmd(c);
  // keep empty dirs in the zip
  f[`${fd.data}/raw_data/.gitkeep`] = "";
  f[`${fd.data}/clean_data/.gitkeep`] = "";
  f[`${fd.outputs}/figures/.gitkeep`] = "";
  f[`${fd.outputs}/tables/.gitkeep`] = "";

  if (c.customFolders) {
    c.customFolders.forEach((p) => { f[`${p}/.gitkeep`] = ""; });
  }

  const lic = genLicense(c);
  if (lic) f["LICENSE"] = lic;
  if (useMake(c)) f["Makefile"] = genMakefile(c);
  if (useRunR(c)) f["run.R"] = genRunR(c);
  if (c.renv) f["renv/README.md"] = genRenvReadme(c);
  if (c.rprofile) { f[".Rprofile"] = genRprofile(c); f[".Renviron"] = genRenviron(c); }
  if (c.docker) f["Dockerfile"] = genDockerfile(c);
  if (c.testthat) {
    f["tests/testthat.R"] = genTestthatRunner();
    f["tests/testthat/test-clean.R"] = genTestthatTest(c);
  }
  if (c.lintr) { f[".lintr"] = genLintr(); f[".editorconfig"] = genEditorconfig(); }
  if (c.precommit) f[".pre-commit-config.yaml"] = genPrecommit(c);
  if (c.citation) f["CITATION.cff"] = genCitation(c);
  if (c.datadict) {
    f[`${fd.data}/data_dictionary.csv`] = genDataDictCsv();
    f[`${fd.data}/README.md`] = genDataReadme(c);
  }
  if (c.contributing) {
    f["CONTRIBUTING.md"] = genContributing(c);
    f["CODE_OF_CONDUCT.md"] = genCodeOfConduct(c);
  }
  if (c.zenodo) f[".zenodo.json"] = genZenodo(c);
  if (c.github) {
    f[".gitignore"] = genGitignore(c);
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

  // file count summary
  const n = Object.keys(buildFiles(c)).filter((p) => !p.endsWith(".gitkeep")).length;
  $("#fileCount").textContent = `${n} files`;

  // show/hide CRS fieldset + renv step + quarto format picker
  $("#crsFs").style.display = c.spatial ? "" : "none";
  $("#renvStep").style.display = c.renv ? "" : "none";
  const qf = $("#quartoFmtField");
  if (qf) qf.style.display = c.quarto ? "" : "none";

  // update dynamic labels that reference generated names
  const pn = scriptNames(c), pd = projDirs(c);
  const scriptTab = document.getElementById("scriptTab");
  if (scriptTab) scriptTab.textContent = `🧪 ${pn.cl}`;
  const startStep = document.getElementById("startStep");
  if (startStep) startStep.innerHTML = `Start with <code>${pd.scripts}/${pn.dl}</code> and work through the files in order.`;

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
    if (input) { input.checked = on; input.closest(".pkg").style.display = on ? "" : "none"; }
  });
}

/* ── presets ─────────────────────────────────────────────────────────── */
function applyPreset(name) {
  const p = PRESETS[name];
  if (!p) return;
  $("#spatial").checked = p.spatial;
  $("#runner").value = p.runner;
  if (p.numbering) { const el = document.getElementById("numbering"); if (el) el.value = p.numbering; }
  Object.entries(p.flags).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.checked = val;
  });
  syncSpatialPackages();
  // set package chips from preset (spatial pkgs handled above)
  $$("#pkgGrid input").forEach((input) => {
    const pkg = PACKAGES.find((x) => x.id === input.value);
    if (pkg && pkg.spatial) return; // managed by spatial toggle
    input.checked = p.pkgs.includes(input.value);
  });
  $$(".preset").forEach((b) => b.classList.toggle("is-active", b.dataset.preset === name));
  refreshPreview();
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

/* ── copy current pane ───────────────────────────────────────────────── */
function initCopy() {
  const btn = $("#copyBtn");
  btn.addEventListener("click", async () => {
    const pane = $(".tabpane.is-active .codeblock");
    if (!pane) return;
    try {
      await navigator.clipboard.writeText(pane.textContent);
      const old = btn.textContent;
      btn.textContent = "✓ Copied";
      setTimeout(() => (btn.textContent = old), 1400);
    } catch {
      showError("Clipboard blocked by the browser — select and copy manually.");
    }
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

/* ── mobile nav ──────────────────────────────────────────────────────── */
function initNav() {
  const toggle  = $("#navToggle");
  const nav     = $("#topnav");
  const overlay = $("#navOverlay");
  if (!toggle || !nav) return;

  const isOpen = () => nav.classList.contains("is-open");

  const open = () => {
    nav.classList.add("is-open");
    toggle.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Close menu");
    overlay.hidden = false;
    // next frame so the opacity transition runs
    requestAnimationFrame(() => overlay.classList.add("is-open"));
    document.body.classList.add("nav-open");
  };
  const close = () => {
    nav.classList.remove("is-open");
    toggle.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open menu");
    overlay.classList.remove("is-open");
    overlay.hidden = true;
    document.body.classList.remove("nav-open");
  };
  const toggleMenu = (e) => { e.stopPropagation(); isOpen() ? close() : open(); };

  toggle.addEventListener("click", toggleMenu);
  overlay.addEventListener("click", close);
  // close after tapping a link (theme toggle keeps the menu open)
  nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

  // belt-and-braces: any tap/click outside the drawer & toggle closes it
  document.addEventListener("click", (e) => {
    if (isOpen() && !nav.contains(e.target) && !toggle.contains(e.target)) close();
  });

  // if the viewport grows back to desktop, reset to a clean state
  window.matchMedia("(min-width: 761px)").addEventListener("change", (e) => {
    if (e.matches) close();
  });
}

/* ── boot ────────────────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  renderPackages();
  initTabs();
  initCopy();
  initTheme();
  initNav();

  $("#spatial").addEventListener("change", () => { syncSpatialPackages(); refreshPreview(); });
  $("#cfgForm").addEventListener("input", refreshPreview);
  $("#cfgForm").addEventListener("submit", (e) => { e.preventDefault(); downloadZip(); });
  $("#downloadBtn").addEventListener("click", downloadZip);
  $("#resetBtn").addEventListener("click", () => {
    $("#cfgForm").reset();
    renderPackages();
    syncSpatialPackages();
    $$(".preset").forEach((b) => b.classList.remove("is-active"));
    document.getElementById("customVarList").innerHTML = "";
    document.getElementById("customFolderList").innerHTML = "";
    refreshPreview();
  });
  $$(".preset").forEach((b) => b.addEventListener("click", () => applyPreset(b.dataset.preset)));
  document.getElementById("addVarBtn").addEventListener("click", () => { addVarRow(); refreshPreview(); });
  document.getElementById("addFolderBtn").addEventListener("click", () => { addFolderRow(); refreshPreview(); });

  refreshPreview();
});
