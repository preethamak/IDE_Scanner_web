# Study protocol: manifest-level structure of IDE extensions

Version: reconstructed 2026-08-12  
Corpus snapshot: `ide-extension-ecosystem-store/20260731-full`  
Unit of analysis: one content-addressed VSIX archive

## Research questions

1. Which execution entry points and activation declarations appear in the archived packages?
2. Which user-facing contribution points—commands, views, languages, debuggers, tasks, and custom editors—are declared?
3. How often do manifests expose provenance fields and workspace-compatibility declarations?
4. What package-structure measurements can be reproduced without executing extension code or assigning security labels?

## Scope and sampling

The corpus is a preserved convenience snapshot of 146 VSIX files collected on 2026-07-31. Files are named by SHA-256 digest. The surviving recovery evidence does not contain the original marketplace query, rank, category, or inclusion log. Consequently, this study does **not** describe the complete Visual Studio Marketplace or Open VSX population and makes no prevalence claim beyond the archived corpus.

Every `.vsix` file directly inside `20260731-full/` is included. The separate 20-package pilot directory is excluded to prevent duplicate observations. The archive itself is not redistributed in the arXiv bundle because package licenses differ; the artifact publishes hashes, derived manifest features, analysis code, and aggregate statistics.

## Extraction procedure

`artifact/analyze_corpus.py` processes archives in lexicographic filename order. For each archive it:

1. computes SHA-256 and compressed byte size;
2. opens the VSIX as ZIP without executing code;
3. reads `extension/package.json` (or root `package.json` as fallback);
4. records manifest identity, version, engine constraint, entry points, activation declarations, contribution counts, dependency counts, provenance fields, and workspace capability declarations;
5. writes `manifest-features.csv` and `summary.json` deterministically.

Errors are recorded by exception class, without silently dropping an archive. The reconstructed run parsed 146 of 146 manifests.

## Operational definitions

- **Node entry point:** non-empty `main` field.
- **Browser entry point:** non-empty `browser` field.
- **Wildcard activation:** `activationEvents` contains the exact value `*`.
- **Contributed view:** an item nested under `contributes.views`; this is a UI declaration, not proof that arbitrary HTML executes.
- **Repository declared:** either `repository` or `homepage` is present.
- **Workspace behavior declared:** `capabilities.untrustedWorkspaces` or `capabilities.virtualWorkspaces` is an object. Absence is not interpreted as unsafe behavior.
- **Dependency count:** number of direct keys under `dependencies`; bundled/transitive dependencies are outside this measure.

## Analysis

Boolean fields are summarized as counts and percentages of valid manifests. Count fields are summarized by median, maximum, and the number and percentage greater than zero. Percentages are rounded to one decimal place. The study is descriptive; it performs no null-hypothesis testing because the corpus is not a probability sample.

## Integrity and reproducibility

Run from the repository root:

```bash
.venv-research/bin/python extension-ecosystem-paper/artifact/analyze_corpus.py \
  ../ide-extension-ecosystem-store/20260731-full \
  --out extension-ecosystem-paper/artifact
```

Compare the regenerated `summary.json` and `manifest-features.csv` with the checked-in copies. A content-addressed filename mismatch is detectable because the script independently recomputes SHA-256.

## Exclusions and ethics

No extension is executed. No network request is made by the analysis. No vulnerability, malware, trust, safety, or publisher-quality label is assigned. The paper contains no evaluation of GuardRails, no scanner accuracy result, and no private customer data. Extension IDs are retained because they are public package identifiers; conclusions are reported in aggregate.

## Threats to validity

- The selection mechanism is unavailable, so selection bias cannot be quantified.
- A manifest captures declared configuration, not all runtime behavior.
- Missing fields may reflect defaults or platform-version differences.
- Counts do not measure importance, risk, code quality, or user impact.
- The corpus is a single temporal snapshot and cannot establish trends.

