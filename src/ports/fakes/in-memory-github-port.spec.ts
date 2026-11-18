import { InMemoryGitHubPort } from './in-memory-github-port';
import type { OwnComment, ReviewSubmission } from '../github-port';

describe('InMemoryGitHubPort', () => {
  describe('fetchDiff', () => {
    it('returns the fixture diff it was constructed with', async () => {
      const port = new InMemoryGitHubPort('fixture diff text');

      const diff = await port.fetchDiff();

      expect(diff).toBe('fixture diff text');
    });
  });

  describe('listOwnComments', () => {
    it('returns the pre-existing comments it was constructed with', async () => {
      const existing: OwnComment[] = [{ id: '1', body: 'existing comment' }];
      const port = new InMemoryGitHubPort('fixture diff text', existing);

      const comments = await port.listOwnComments();

      expect(comments).toEqual(existing);
    });

    it('includes comments posted via postReview on a later call', async () => {
      const port = new InMemoryGitHubPort('fixture diff text', [{ id: '1', body: 'existing' }]);
      const review: ReviewSubmission = {
        event: 'COMMENT',
        comments: [{ path: 'src/foo.ts', line: 10, body: 'new finding' }],
      };

      await port.postReview(review);
      const comments = await port.listOwnComments();

      expect(comments).toEqual([
        { id: '1', body: 'existing' },
        expect.objectContaining({ body: 'new finding' }),
      ]);
    });
  });

  describe('postReview', () => {
    it('records the submission it received', async () => {
      const port = new InMemoryGitHubPort('fixture diff text');
      const review: ReviewSubmission = {
        event: 'REQUEST_CHANGES',
        comments: [{ path: 'src/foo.ts', line: 10, body: 'a finding' }],
      };

      await port.postReview(review);

      expect(port.postedReviews).toEqual([review]);
    });
  });

  describe('upsertSummary', () => {
    it('stores the summary body', async () => {
      const port = new InMemoryGitHubPort('fixture diff text');

      await port.upsertSummary('first summary');

      expect(port.summary).toBe('first summary');
    });

    it('replaces the summary in place on a later call instead of duplicating it', async () => {
      const port = new InMemoryGitHubPort('fixture diff text');

      await port.upsertSummary('first summary');
      await port.upsertSummary('second summary');

      expect(port.summary).toBe('second summary');
    });
  });
});
