# IDE Extension Ecosystem Paper

This directory reconstructs the lost public-research paper from the surviving 2026-07-31 content-addressed VSIX corpus.

## Outputs

- `main.tex` — complete manuscript source
- `main.pdf` — compiled manuscript
- `artifact/study-protocol.md` — scope, operational definitions, and limitations
- `artifact/analyze_corpus.py` — deterministic manifest extractor
- `artifact/manifest-features.csv` — one derived row per archive
- `artifact/summary.json` — aggregate results used by the manuscript
- `build/ide-extension-ecosystems-arxiv.tar.gz` — self-contained arXiv source bundle

## Reproduce the analysis

From `ide-scanner-web/`:

```bash
.venv-research/bin/python extension-ecosystem-paper/artifact/analyze_corpus.py \
  ../ide-extension-ecosystem-store/20260731-full \
  --out extension-ecosystem-paper/artifact
```

The input corpus is not copied into this directory. It remains at `../ide-extension-ecosystem-store/20260731-full` relative to this repository. The analysis reads ZIP metadata and `package.json`; it never executes extension code.

## Build the paper

```bash
cd extension-ecosystem-paper
latexmk -pdf -interaction=nonstopmode -halt-on-error main.tex
```

## Research boundary

This is a descriptive public-artifact study. It does not evaluate GuardRails, scanner accuracy, vulnerability detection, malware prevalence, or publisher trustworthiness. The reconstructed source explicitly documents that the surviving corpus is a convenience snapshot whose original selection log was lost.

