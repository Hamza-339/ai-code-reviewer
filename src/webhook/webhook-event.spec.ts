import { parseReviewableTarget } from './webhook-event';

function pullRequestPayload(action: string) {
  return {
    action,
    pull_request: { number: 42 },
    repository: { name: 'widgets', owner: { login: 'acme' } },
  };
}

describe('parseReviewableTarget', () => {
  it('returns the PR target for an opened pull_request event', () => {
    expect(parseReviewableTarget('pull_request', pullRequestPayload('opened'))).toEqual({
      owner: 'acme',
      repo: 'widgets',
      pullNumber: 42,
    });
  });

  it('returns the PR target for a synchronize pull_request event', () => {
    expect(parseReviewableTarget('pull_request', pullRequestPayload('synchronize'))).toEqual({
      owner: 'acme',
      repo: 'widgets',
      pullNumber: 42,
    });
  });

  it('returns null for a non-reviewable pull_request action', () => {
    expect(parseReviewableTarget('pull_request', pullRequestPayload('closed'))).toBeNull();
  });

  it('returns null for a non-pull_request event', () => {
    expect(parseReviewableTarget('issues', pullRequestPayload('opened'))).toBeNull();
  });

  it('returns null when the payload is missing expected fields', () => {
    expect(parseReviewableTarget('pull_request', { action: 'opened' })).toBeNull();
  });
});
