# No database; deduplicate re-run findings via content fingerprint reconstructed from GitHub

The App stores **no persistent state**. On every run it reconstructs what it needs from GitHub: it lists its own existing review comments and skips any finding already present. The Summary is a single sticky comment, found and updated in place via a hidden HTML marker.

Deduplication keys on a **content fingerprint** — `path + category + a normalized hash of the offending code` — deliberately **not** on line number, because line numbers shift between pushes and would cause the same issue to be re-posted as a "new" comment after an unrelated edit above it.

## Consequences

- Avoids running a database for a single-tenant v1 (simpler, cheaper, fits the serverless host in ADR-0002).
- Fingerprinting on normalized code, not position, is the non-obvious part: it is what makes re-runs idempotent across rebases and edits. A future reader must not "simplify" it back to a line-based key.
