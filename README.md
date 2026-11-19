# ai-code-reviewer

## Deploy

Hosted on Vercel Hobby per [ADR-0002](docs/adr/0002-vercel-hobby-ack-then-background-review.md): `api/index.ts` wraps the NestJS app (`src/app.module.ts`) as a serverless function, with every route rewritten to it by `vercel.json`. Provisioning the GitHub App and the Vercel project is a one-time manual procedure — run `scripts/provision-infra.sh` and follow its wizard.

Required environment variables (set in the Vercel project's Settings → Environment Variables, and written locally to `.env` by the provisioning wizard):

| Variable | Used by |
| --- | --- |
| `GITHUB_WEBHOOK_SECRET` | `src/webhook/webhook-signature.ts` — HMAC-verifies deliveries |
| `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_INSTALLATION_ID`, `GITHUB_APP_SLUG` | `src/ports/github-app-port.ts` — production `GitHubPort` |
| `ANTHROPIC_API_KEY` | `src/ports/claude-model-port.ts` — production `ModelPort` |

The GitHub App's webhook URL is `<vercel-project-url>/webhook/github`.

### Local dev

```sh
npm run build && npm start
```

Runs the same Nest app as a long-lived Express server (`src/main.ts`) instead of a serverless function, for manual testing against `http://localhost:3000`.
