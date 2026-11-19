import { waitUntil as vercelWaitUntil } from '@vercel/functions';
import type { ReviewTrigger } from '../ports/review-trigger';
import type { GitHubPort, PullRequestTarget } from '../ports/github-port';
import type { ModelPort } from '../ports/model-port';
import { createGitHubAppPort } from '../ports/github-app-port';
import { createClaudeModelPort } from '../ports/claude-model-port';
import { runReview } from '../core/review-core';

export interface VercelReviewTriggerDeps {
  waitUntil: (promise: Promise<unknown>) => void;
  createGitHubPort: (target: PullRequestTarget) => GitHubPort;
  createModelPort: () => ModelPort;
}

export class VercelReviewTrigger implements ReviewTrigger {
  constructor(private readonly deps: VercelReviewTriggerDeps) {}

  trigger(target: PullRequestTarget): void {
    const work = (async () => {
      const github = this.deps.createGitHubPort(target);
      const model = this.deps.createModelPort();
      await runReview(github, model);
    })().catch((error: unknown) => {
      console.error('Background review failed', error);
    });
    this.deps.waitUntil(work);
  }
}

export function createVercelReviewTrigger(): VercelReviewTrigger {
  return new VercelReviewTrigger({
    waitUntil: vercelWaitUntil,
    createGitHubPort: createGitHubAppPort,
    createModelPort: createClaudeModelPort,
  });
}
