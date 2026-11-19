# Review pipeline

`runReview` (`src/core/review-core.ts`) is the orchestrator. Stages run in this order:

1. **Fetch diff** — `GitHubPort.fetchDiff()` (`src/ports/github-port.ts`)
2. **Parse diff** — `parseDiff` (`src/diff/parse-diff.ts`) → `ParsedDiffFile[]`
3. **Filter files** — `shouldReview` (`src/filter/file-filter.ts`)
4. **Fit token budget** — `selectWithinBudget` (`src/budget/token-budget.ts`), using `ModelPort.countTokens`
5. **Model review** — `ModelPort.review(renderedDiff)` (`src/ports/model-port.ts`) → raw `Finding[]`
6. **Validate** — `validateFindings` (`src/validator/line-validator.ts`): discards findings off changed lines
7. **Compute verdict** — `computeVerdict` (`src/verdict/verdict.ts`), from `validFindings` (see ADR-0003 — computed before dedup, so it reflects every unresolved finding, not just freshly-posted ones)
8. **Dedupe** — `computeFingerprint` / `dedupeFindings` (`src/fingerprint/fingerprint.ts`) against fingerprints already posted (see ADR-0005)
9. **Post** — `GitHubPort.postReview` + `upsertSummary`

`getCodeAtLine` (`src/diff/parse-diff.ts`) is the only accessor for a `ParsedDiffFile`'s code-at-line; see `CODING_STANDARDS.md`.

Domain types (`Finding`, `Verdict`) live in `src/domain/finding.ts`; ports and their in-memory fakes live in `src/ports/` and `src/ports/fakes/`.

# Eval harness

`src/eval/` replays the Eval set (`src/eval/fixtures.ts`) through the same `runReview` seam, with the live `ModelPort` and an in-memory `GitHubPort`, and scores the result (recall, precision, false-alarm count — see `GLOSSARY.md`). It runs via `npm run eval` against the built output, from `.github/workflows/eval.yml` (manual dispatch / nightly), and never from the gating CI suite (ADR-0006).

`RecordingModelPort` (`src/eval/recording-model-port.ts`) wraps a `ModelPort` to recover each posted `Finding`'s Category and Severity for scoring, since `GitHubPort.postReview` only carries path/line/body.
