# Ship v1 as a single-tenant GitHub App with a delivery-agnostic review core

We build v1 as a **GitHub App** (webhook on PR opened/updated → authenticate as the installation → post back) rather than a GitHub Action, because signature verification, installation auth, and re-run deduplication are the parts worth demonstrating in a portfolio, and they only exist in the App model. The App is **single-tenant** for v1 (our own repos / a demo org): predictable inputs, no multi-tenant rate-limiting or abuse handling yet.

Crucially, the review engine (diff parsing, model call, finding validation, verdict, posting) is a **delivery-agnostic core module** with no dependency on the webhook transport. Multi-tenant hardening, or an alternative Action wrapper, is then a thin adapter rather than a rewrite.

## Considered Options

- **GitHub Action (per-repo CI job)** — truly free and no server, but abandons the webhook/signature/installation-auth story and gives fork PRs a read-only token. Kept as the fallback delivery mode precisely because the core is delivery-agnostic.
- **Multi-tenant App from day one** — rejected as scope creep for a v1 portfolio piece.
