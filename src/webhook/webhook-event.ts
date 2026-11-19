import type { PullRequestTarget } from '../ports/github-port';

const REVIEWABLE_ACTIONS = new Set(['opened', 'synchronize']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseReviewableTarget(eventName: string, payload: unknown): PullRequestTarget | null {
  if (eventName !== 'pull_request' || !isRecord(payload)) {
    return null;
  }

  const { action, pull_request: pullRequest, repository } = payload;
  if (typeof action !== 'string' || !REVIEWABLE_ACTIONS.has(action)) {
    return null;
  }

  if (!isRecord(pullRequest) || typeof pullRequest.number !== 'number') {
    return null;
  }

  if (!isRecord(repository) || typeof repository.name !== 'string' || !isRecord(repository.owner)) {
    return null;
  }

  const ownerLogin = repository.owner.login;
  if (typeof ownerLogin !== 'string') {
    return null;
  }

  return { owner: ownerLogin, repo: repository.name, pullNumber: pullRequest.number };
}
