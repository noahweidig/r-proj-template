# =============================================================================
# Setup.R
# Description: Interactive one-time project scaffolding script.
# =============================================================================

cat("\n━━━━━━━━━━━━━\n")
cat("Project Setup\n")
cat("━━━━━━━━━━━━━\n\n")

if (dirname(rstudioapi::getSourceEditorContext()$path) != "") {
  setwd(dirname(rstudioapi::getSourceEditorContext()$path))
}

# Safety check — refuse to run in home directory
if (normalizePath(getwd()) == normalizePath(Sys.getenv("HOME"))) {
  stop(
    "\n\n  Setup.R is running from your home directory (~).\n",
    "  Please move Setup.R into your project folder first,\n",
    "  then open it in RStudio and run it from there.\n",
    "  Or use Session > Set Working Directory > To Source File Location.\n",
    call. = FALSE
  )
}

cat("  Working directory: ", getwd(), "\n\n")
# Collect inputs ----

# Helper: keep asking until the user types something non-empty
prompt_required <- function(label) {
  repeat {
    val <- readline(paste0(label, ": "))
    val <- trimws(val)
    if (nchar(val) > 0) return(val)
    cat("  ! This field is required. Please try again.\n")
  }
}

# Helper: show a default value and use it if the user just hits Enter
prompt_default <- function(label, default) {
  val <- readline(paste0(label, " [", default, "]: "))
  val <- trimws(val)
  if (nchar(val) == 0) default else val
}

proj_name   <- prompt_required("Project name")
proj_author <- prompt_required("Author name")
crs_proj    <- prompt_default("Projected CRS EPSG", "5070")
use_renv    <- prompt_default("Initialise renv? (yes/no)", "yes")

today <- format(Sys.Date(), "%Y-%m-%d")

# Confirm before doing anything ----

cat("\nSummary ----\n")
cat("  Project : ", proj_name,   "\n")
cat("  Author  : ", proj_author, "\n")
cat("  CRS     : ", crs_proj,    "\n")
cat("  renv    : ", use_renv,    "\n")
cat("  Folder  : ", getwd(),     "\n")
cat("----\n")

confirm <- readline("Create project? (yes/no) [yes]: ")
confirm <- trimws(tolower(confirm))

if (confirm %in% c("no", "n")) {
  stop("Setup cancelled. Nothing was created.", call. = FALSE)
}

cat("\n Starting...\n\n")

# Write a text file, printing a message on success
write_file <- function(path, content) {
  dir.create(dirname(path), recursive = TRUE, showWarnings = FALSE)
  writeLines(content, con = path)
  message("  [created] ", path)
}

# 1. Directory structure ----

dirs <- c(
  "01_data/raw_data",
  "01_data/clean_data",
  "02_scripts",
  "03_outputs/figures",
  "03_outputs/tables"
)

message("\n Creating directories ----")
for (d in dirs) {
  dir.create(d, recursive = TRUE, showWarnings = FALSE)
  message("  [created] ", d, "/")
}

# 2. .Rproj file ----

message("\n Writing .Rproj ----")

# Derive the project name from the current working directory folder name
rproj_name <- basename(getwd())
rproj_path <- paste0(rproj_name, ".Rproj")

rproj_content <- c(
  "Version: 1.0",
  "",
  "RestoreWorkspace: No",
  "SaveWorkspace: No",
  "AlwaysSaveHistory: Default",
  "",
  "EnableCodeIndexing: Yes",
  "UseSpacesForTab: Yes",
  "NumSpacesForTab: 2",
  "Encoding: UTF-8",
  "",
  "RnwWeave: Sweave",
  "LaTeX: pdfLaTeX",
  "",
  "AutoAppendNewline: Yes",
  "StripTrailingWhitespace: Yes",
  "LineEndingConversion: Posix",
  "",
  "BuildType: None"
)

write_file(rproj_path, rproj_content)

# 3. config.R ----

message("\n Writing config.R ----")

config_content <- c(
  "# =============================================================================",
  "# config.R",
  paste0("# Project:     ", proj_name),
  "# Description: Universal project configuration — paths, constants, CRS, etc.",
  paste0("# Author:      ", proj_author),
  paste0("# Date:        ", today),
  "# =============================================================================",
  "",
  "# Packages ----",
  "library(here)       # robust relative paths",
  "library(sf)         # vector spatial data",
  "library(terra)      # raster spatial data",
  "library(tidyverse)  # data wrangling & plotting",
  "library(janitor)    # column name cleaning",
  "",
  "# Paths ----",
  'PROJ_ROOT   <- here::here()',
  'DATA_RAW    <- here::here("01_data", "raw_data")',
  'DATA_CLEAN  <- here::here("01_data", "clean_data")',
  'SCRIPTS     <- here::here("02_scripts")',
  'OUT_FIGURES <- here::here("03_outputs", "figures")',
  'OUT_TABLES  <- here::here("03_outputs", "tables")',
  "",
  "# CRS ----",
  "CRS_GEO     <- 4326   # WGS 84 geographic",
  "CRS_PROJ    <- 5070   # Albers Equal Area (CONUS) — change as needed",
  "",
  "# Visual theme ----",
  "theme_set(theme_minimal(base_size = 13))",
  "",
  "# Reproducibility ----",
  "set.seed(42)",
  ""
)

write_file("config.R", config_content)

# 4. Analysis scripts 

message("\n Writing 02_scripts/ ")

# Helper: build a standard R script header
r_header <- function(filename, description) {
  c(
    "# =============================================================================",
    paste0("# ", filename),
    paste0("# Project:     ", proj_name),
    paste0("# Description: ", description),
    paste0("# Author:      ", proj_author),
    paste0("# Date:        ", today),
    "# =============================================================================",
    "",
    'source(here::here("config.R"))',
    ""
  )
}

# 01_download_data.R
write_file(
  "02_scripts/01_download_data.R",
  c(
    r_header("01_download_data.R", "Download raw data from source(s) to 01_data/raw_data/"),
    "# Download ----",
    "",
    "# Example: download a file",
    "# url  <- \"https://example.com/data.geojson\"",
    "# dest <- file.path(DATA_RAW, \"data.geojson\")",
    "# if (!file.exists(dest)) download.file(url, dest, mode = \"wb\")",
    ""
  )
)

# 02_clean_data.R
write_file(
  "02_scripts/02_clean_data.R",
  c(
    r_header("02_clean_data.R", "Read raw data, clean/transform, write to 01_data/clean_data/"),
    "# Read ----",
    "",
    "# raw <- sf::st_read(file.path(DATA_RAW, \"data.geojson\"))",
    "",
    "# Clean ----",
    "",
    "# clean <- raw |>",
    "#   janitor::clean_names() |>",
    "#   sf::st_transform(CRS_PROJ)",
    "",
    "# Write ----",
    "",
    "# sf::st_write(clean, file.path(DATA_CLEAN, \"data_clean.gpkg\"), delete_dsn = TRUE)",
    ""
  )
)

# 03_model_data.R
write_file(
  "02_scripts/03_model_data.R",
  c(
    r_header("03_model_data.R", "Model / analyse cleaned data"),
    "# Read ----",
    "",
    "# clean <- sf::st_read(file.path(DATA_CLEAN, \"data_clean.gpkg\"))",
    "",
    "# Model ----",
    "",
    "# results <- lm(y ~ x, data = clean)",
    "# summary(results)",
    "",
    "# Save results ----",
    "",
    "# saveRDS(results, file.path(OUT_TABLES, \"model_results.rds\"))",
    ""
  )
)

# 04_visualize_data.R
write_file(
  "02_scripts/04_visualize_data.R",
  c(
    r_header("04_visualize_data.R", "Produce maps, charts, and figures → 03_outputs/figures/"),
    "library(ggplot2)",
    "",
    "# Read ----",
    "",
    "# clean <- sf::st_read(file.path(DATA_CLEAN, \"data_clean.gpkg\"))",
    "",
    "# Plot ----",
    "",
    "# p <- ggplot(clean) +",
    "#   geom_sf(aes(fill = variable)) +",
    "#   scale_fill_viridis_c() +",
    "#   labs(title = \"My Map\", fill = \"Value\")",
    "",
    "# Save ----",
    "",
    "# ggsave(file.path(OUT_FIGURES, \"map.png\"), p, width = 10, height = 7, dpi = 300)",
    ""
  )
)

# 05_report_data.qmd
message("  [created] 02_scripts/05_report_data.qmd")

qmd_content <- c(
  "---",
  paste0('title: "', proj_name, '"'),
  paste0('author: "', proj_author, '"'),
  paste0('date: "', today, '"'),
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
  '#| include: false',
  'source(here::here("config.R"))',
  "```",
  "",
  "## Introduction",
  "",
  "Describe your project here.",
  "",
  "## Data",
  "",
  "```{r load-data}",
  "# clean <- sf::st_read(file.path(DATA_CLEAN, \"data_clean.gpkg\"))",
  "```",
  "",
  "## Results",
  "",
  "```{r results}",
  "# Your analysis output here",
  "```",
  "",
  "## Maps & Figures",
  "",
  "```{r figures}",
  "# knitr::include_graphics(file.path(OUT_FIGURES, \"map.png\"))",
  "```",
  ""
)

writeLines(qmd_content, "02_scripts/05_report_data.qmd")

# 5. README.md ----

message("\n Writing README.md ----")

readme_content <- c(
  paste0("# ", proj_name),
  "",
  paste0("> Created: ", today, "  "),
  paste0("> Author:  ", proj_author),
  "",
  "## Overview",
  "",
  "A short description of the project, its goals, and key outputs.",
  "",
  "## Project Structure",
  "",
  "```",
  ".",
  paste0("├── ", rproj_name, ".Rproj          # RStudio project file (open this to launch)"),
  "├── config.R                        # Universal config: paths, CRS, theme",
  "├── Setup.R                         # This scaffolding script (run once)",
  "├── README.md",
  "├── LICENSE",
  "├── renv.lock",
  "├── 01_data/",
  "│   ├── raw_data/                   # Downloaded / original data (do not edit)",
  "│   └── clean_data/                 # Processed data ready for analysis",
  "├── 02_scripts/",
  "│   ├── 01_download_data.R",
  "│   ├── 02_clean_data.R",
  "│   ├── 03_model_data.R",
  "│   ├── 04_visualize_data.R",
  "│   └── 05_report_data.qmd",
  "└── 03_outputs/",
  "    ├── figures/",
  "    └── tables/",
  "```",
  "",
  "## Workflow",
  "",
  "Run scripts in numbered order:",
  "",
  "```r",
  'source("02_scripts/01_download_data.R")',
  'source("02_scripts/02_clean_data.R")',
  'source("02_scripts/03_model_data.R")',
  'source("02_scripts/04_visualize_data.R")',
  "# Then render 05_report_data.qmd in RStudio or via quarto::quarto_render()",
  "```",
  "",
  "## Requirements",
  "",
  "- R >= 4.2",
  "- Quarto >= 1.3",
  "- `renv` for package management (`renv::restore()` to install packages)",
  "",
  "## License",
  "",
  "MIT — see [LICENSE](LICENSE)",
  ""
)

write_file("README.md", readme_content)

# 6. MIT LICENSE ----

message("\n Writing LICENSE ----")

license_content <- c(
  "MIT License",
  "",
  paste0("Copyright (c) ", format(Sys.Date(), "%Y"), " ", proj_author),
  "",
  "Permission is hereby granted, free of charge, to any person obtaining a copy",
  "of this software and associated documentation files (the \"Software\"), to deal",
  "in the Software without restriction, including without limitation the rights",
  "to use, copy, modify, merge, publish, distribute, sublicense, and/or sell",
  "copies of the Software, and to permit persons to whom the Software is",
  "furnished to do so, subject to the following conditions:",
  "",
  "The above copyright notice and this permission notice shall be included in all",
  "copies or substantial portions of the Software.",
  "",
  'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR',
  "IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,",
  "FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE",
  "AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER",
  "LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,",
  "OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE",
  "SOFTWARE.",
  ""
)

write_file("LICENSE", license_content)

# 7. renv ----

message("\n Initialising renv ----")

if (!requireNamespace("renv", quietly = TRUE)) {
  message("  renv not found — installing from CRAN …")
  install.packages("renv")
}

renv::init(bare = TRUE)
message("  renv initialised. Run renv::snapshot() after installing packages.")

# 8. Makefile ----
message("\n Writing Makefile ----")

makefile_content <- c(
  "# ====================",
  "# Makefile",
  paste0("# Project: ", proj_name),
  paste0("# Author:  ", proj_author),
  paste0("# Date:    ", today),
  "# ====================",
  "",
  "# Default target — run the full pipeline",
  ".PHONY: all clean download clean_data model visualize report",
  "",
  "all: download clean_data model visualize report",
  "",
  "# Run individual steps ----",
  "",
  "download:",
  "\tRscript -e 'source(\"02_scripts/01_download_data.R\")'",
  "",
  "clean_data:",
  "\tRscript -e 'source(\"02_scripts/02_clean_data.R\")'",
  "",
  "model:",
  "\tRscript -e 'source(\"02_scripts/03_model_data.R\")'",
  "",
  "visualize:",
  "\tRscript -e 'source(\"02_scripts/04_visualize_data.R\")'",
  "",
  "report:",
  "\tquarto render 02_scripts/05_report_data.qmd",
  "",
  "# Helpers ----",
  "",
  "# Delete all outputs and cleaned data (raw data is preserved)",
  "clean:",
  "\tRscript -e 'unlink(\"01_data/clean_data/*\")'",
  "\tRscript -e 'unlink(\"03_outputs/figures/*\")'",
  "\tRscript -e 'unlink(\"03_outputs/tables/*\")'",
  "\t@echo \"Outputs cleared. Raw data preserved.\"",
  "",
  "# Restore renv packages",
  "restore:",
  "\tRscript -e 'renv::restore()'",
  "",
  "# Snapshot renv packages",
  "snapshot:",
  "\tRscript -e 'renv::snapshot()'",
  "",
  "# Print help",
  "help:",
  "\t@echo \"\"",
  paste0("\t@echo \"  ", proj_name, "\""),
  "\t@echo \"\"",
  "\t@echo \"  Targets:\"",
  "\t@echo \"    make all          Run the full pipeline\"",
  "\t@echo \"    make download     Download raw data\"",
  "\t@echo \"    make clean_data   Clean and process data\"",
  "\t@echo \"    make model        Run models\"",
  "\t@echo \"    make visualize    Generate figures\"",
  "\t@echo \"    make report       Render Quarto report\"",
  "\t@echo \"    make clean        Delete outputs (raw data preserved)\"",
  "\t@echo \"    make restore      Restore renv packages\"",
  "\t@echo \"    make snapshot     Snapshot renv packages\"",
  "\t@echo \"\"",
  ""
)

write_file("Makefile", makefile_content)
# 9. Summary --------

message(sprintf("
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ✓  Project scaffolding complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 .Rproj:  %s
 Root:    %s

 Next steps:
   1. Close this session and reopen via %s.Rproj
   2. Review / extend config.R (CRS, packages, constants)
   3. Install your packages, then run:  renv::snapshot()
   4. Start with 02_scripts/01_download_data.R

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
", rproj_path, getwd(), rproj_name))