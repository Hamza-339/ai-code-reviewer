import { FakeModelPort } from './fake-model-port';
import { InMemoryGitHubPort } from './in-memory-github-port';
import type { Finding, Verdict } from '../../domain/finding';
import type { ReviewEvent } from '../github-port';

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    path: 'src/foo.ts',
    line: 10,
    category: 'bug',
    severity: 'warning',
    explanation: 'explanation',
    ...overrides,
  };
}

const verdictToEvent: Record<Verdict, ReviewEvent> = {
  'request-changes': 'REQUEST_CHANGES',
  comment: 'COMMENT',
  approve: 'APPROVE',
};

describe('FakeModelPort + InMemoryGitHubPort composed through a toy pipeline', () => {
  it('fetches the diff, reviews it, and posts the resulting finding as a Review plus a Summary', async () => {
    const githubPort = new InMemoryGitHubPort('fixture diff text');
    const modelPort = new FakeModelPort([[finding()]]);

    const diff = await githubPort.fetchDiff();
    const findings = await modelPort.review(diff);
    await githubPort.postReview({
      event: verdictToEvent.comment,
      comments: findings.map((f) => ({ path: f.path, line: f.line, body: f.explanation })),
    });
    await githubPort.upsertSummary('1 finding, verdict: comment');

    expect(modelPort.requests).toEqual(['fixture diff text']);
    expect(githubPort.postedReviews).toEqual([
      { event: 'COMMENT', comments: [{ path: 'src/foo.ts', line: 10, body: 'explanation' }] },
    ]);
    expect(githubPort.summary).toBe('1 finding, verdict: comment');
  });

  it('makes a comment posted on one run visible to listOwnComments on a later run against the same ports', async () => {
    const githubPort = new InMemoryGitHubPort('fixture diff text');

    await githubPort.postReview({
      event: 'COMMENT',
      comments: [{ path: 'src/foo.ts', line: 10, body: 'explanation' }],
    });
    const comments = await githubPort.listOwnComments();

    expect(comments).toEqual([expect.objectContaining({ body: 'explanation' })]);
  });
});
