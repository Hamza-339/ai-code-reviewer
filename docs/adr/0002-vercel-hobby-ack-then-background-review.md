# Host on Vercel Hobby; acknowledge the webhook, then review in the background

The App is hosted on **Vercel Hobby** and handles each webhook by verifying the signature, returning `2xx` immediately, and running the review as background work (`waitUntil`) within the function's 300s limit — a Haiku review takes seconds, so it fits comfortably.

This was driven by a hard constraint: **zero cost and no credit card**. We verified (Nov 2026) that no-card, always-on *servers* effectively no longer exist — Fly.io requires a card past its trial, and Oracle Always Free requires a card at signup and can reclaim idle instances. Vercel Hobby is free with no card. The ack-then-background pattern is required because GitHub expects a prompt `2xx` and does not auto-retry failed App deliveries.

## Consequences

- NestJS runs as a wrapped serverless handler, not its native long-lived server; expect cold starts.
- Vercel Hobby is **non-commercial use only** — acceptable for a single-tenant personal demo (see ADR-0001), but a blocker for any commercial or multi-tenant future, which would force a move to a paid/always-on host.
