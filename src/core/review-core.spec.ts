import { runReview } from './review-core';
import { FakeModelPort } from '../ports/fakes/fake-model-port';
import { InMemoryGitHubPort } from '../ports/fakes/in-memory-github-port';
import type { Finding } from '../domain/finding';

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    path: 'src/a.ts',
    line: 2,
    category: 'bug',
    severity: 'warning',
    explanation: 'explanation',
    ...overrides,
  };
}

const oneFileDiff = [
  'diff --git a/src/a.ts b/src/a.ts',
  'index abc123..def456 100644',
  '--- a/src/a.ts',
  '+++ b/src/a.ts',
  '@@ -1,2 +1,4 @@',
  ' line1',
  '+foo();',
  '+foo();',
  ' line3',
  '',
].join('\n');

describe('runReview', () => {
  it('posts a single Review with the Finding as an inline comment, event matching the computed Verdict', async () => {
    const github = new InMemoryGitHubPort(oneFileDiff);
    const model = new FakeModelPort([[finding()]]);

    await runReview(github, model);

    expect(github.postedReviews).toHaveLength(1);
    const [review] = github.postedReviews;
    expect(review?.event).toBe('COMMENT');
    expect(review?.comments).toHaveLength(1);
    const [comment] = review?.comments ?? [];
    expect(comment?.path).toBe('src/a.ts');
    expect(comment?.line).toBe(2);
    expect(comment?.body).toContain('explanation');
  });

  it('discards a Finding whose line is not a Changed line, never posting it', async () => {
    const github = new InMemoryGitHubPort(oneFileDiff);
    const model = new FakeModelPort([[finding({ line: 99 })]]);

    await runReview(github, model);

    expect(github.postedReviews).toHaveLength(1);
    expect(github.postedReviews[0]?.comments).toEqual([]);
  });

  it('upserts the Summary in place across two runs, stating the computed Verdict', async () => {
    const github = new InMemoryGitHubPort(oneFileDiff);
    const model = new FakeModelPort([[finding()], [finding()]]);

    await runReview(github, model);
    const firstSummary = github.summary;
    await runReview(github, model);

    expect(firstSummary).toContain('comment');
    expect(github.summary).toContain('comment');
    expect(typeof github.summary).toBe('string');
  });

  it('suppresses a Finding already posted, even when its line has shifted, while the Verdict still reflects it', async () => {
    const github = new InMemoryGitHubPort(oneFileDiff);
    const blocker = finding({ line: 2, severity: 'blocker' });
    const shiftedBlocker = finding({ line: 3, severity: 'blocker' });
    const model = new FakeModelPort([[blocker], [shiftedBlocker]]);

    await runReview(github, model);
    await runReview(github, model);

    expect(github.postedReviews).toHaveLength(2);
    expect(github.postedReviews[0]?.comments).toHaveLength(1);
    expect(github.postedReviews[1]?.comments).toEqual([]);
    expect(github.postedReviews[1]?.event).toBe('REQUEST_CHANGES');
  });

  it('discloses in the Summary that the review was truncated when the token budget is exceeded', async () => {
    const github = new InMemoryGitHubPort(oneFileDiff);
    const model = new FakeModelPort([[]]);

    await runReview(github, model, { tokenBudget: 1 });

    expect(github.summary).toContain('truncated');
  });
});
