# Coding standards

Read during code review. See `docs/architecture.md` for how the review pipeline composes.

## Encapsulate diff/domain encodings behind their owning module's accessors

`ParsedDiffFile.rendered` stores a `"line\tcontent"` encoding. Code outside `src/diff/parse-diff.ts` must go through its exported accessors (e.g. `getCodeAtLine`) rather than re-parsing `rendered` itself. The same rule applies to any other internal encoding owned by a module (fingerprint strings, patch hunk headers): callers use the owning module's functions, never the raw format.

**Why:** the encoding is an implementation detail. Reparsing it elsewhere means a format change requires hunting down every ad-hoc parse site instead of one function.

## Don't derive the same value twice in one pipeline

If a value is computed from the same inputs more than once within a single pipeline run (e.g. `review-core.ts`'s per-finding code-at-line lookup), compute it once and pass it through — don't recompute it at each usage site, even if each call site is individually cheap.

**Why:** duplicate derivations drift apart silently if one call site's inputs change and the other's don't, and they hide that two pieces of code are actually using the same value.

## Fire-and-forget triggers must never throw synchronously

Any trigger that acks a caller before doing the real work (the webhook handler's `ReviewTrigger`, `waitUntil` background work) must wrap everything it does — including constructing its dependencies — in an async boundary with a `.catch`, so the synchronous call that triggers it can never see a rejection. See `VercelReviewTrigger.trigger()` (`src/webhook/vercel-review-trigger.ts`) and ADR-0002.

**Why:** GitHub expects a prompt `2xx` and does not retry failed deliveries. If port construction (e.g. a missing `GITHUB_APP_ID`) or the review itself throws outside the wrapper, the ack is lost along with the delivery — not just the review.
