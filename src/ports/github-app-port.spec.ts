import { GitHubAppGitHubPort, createGitHubAppPort } from './github-app-port';
import type { GitHubClient } from './github-app-port';

function fakeClient(overrides: Partial<GitHubClient> = {}): GitHubClient {
  return {
    pulls: {
      get: jest.fn(),
      listAllReviewComments: jest.fn(),
      createReview: jest.fn(),
      ...overrides.pulls,
    },
    issues: {
      listAllComments: jest.fn(),
      createComment: jest.fn(),
      updateComment: jest.fn(),
      ...overrides.issues,
    },
  };
}

describe('GitHubAppGitHubPort', () => {
  describe('fetchDiff', () => {
    it('returns the diff text fetched for the configured PR', async () => {
      const get = jest.fn().mockResolvedValue({ data: 'diff --git a/a.ts b/a.ts' });
      const client = fakeClient({ pulls: { get, listAllReviewComments: jest.fn(), createReview: jest.fn() } });
      const port = new GitHubAppGitHubPort(client, {
        owner: 'acme',
        repo: 'widgets',
        pullNumber: 7,
        appSlug: 'ai-reviewer',
      });

      const diff = await port.fetchDiff();

      expect(diff).toBe('diff --git a/a.ts b/a.ts');
      expect(get).toHaveBeenCalledWith({
        owner: 'acme',
        repo: 'widgets',
        pull_number: 7,
        mediaType: { format: 'diff' },
      });
    });
  });

  describe('listOwnComments', () => {
    it('returns only review comments authored by the App bot login', async () => {
      const listAllReviewComments = jest.fn().mockResolvedValue([
        { id: 1, body: 'from the app', user: { login: 'ai-reviewer[bot]' } },
        { id: 2, body: 'from a human', user: { login: 'someone' } },
      ]);
      const client = fakeClient({
        pulls: { get: jest.fn(), listAllReviewComments, createReview: jest.fn() },
      });
      const port = new GitHubAppGitHubPort(client, {
        owner: 'acme',
        repo: 'widgets',
        pullNumber: 7,
        appSlug: 'ai-reviewer',
      });

      const comments = await port.listOwnComments();

      expect(comments).toEqual([{ id: '1', body: 'from the app' }]);
      expect(listAllReviewComments).toHaveBeenCalledWith({ owner: 'acme', repo: 'widgets', pull_number: 7 });
    });
  });

  describe('postReview', () => {
    it('posts a single review carrying the verdict event and inline comments', async () => {
      const createReview = jest.fn().mockResolvedValue({});
      const client = fakeClient({
        pulls: { get: jest.fn(), listAllReviewComments: jest.fn(), createReview },
      });
      const port = new GitHubAppGitHubPort(client, {
        owner: 'acme',
        repo: 'widgets',
        pullNumber: 7,
        appSlug: 'ai-reviewer',
      });

      await port.postReview({
        event: 'REQUEST_CHANGES',
        comments: [{ path: 'src/foo.ts', line: 10, body: 'a finding' }],
      });

      expect(createReview).toHaveBeenCalledTimes(1);
      expect(createReview).toHaveBeenCalledWith({
        owner: 'acme',
        repo: 'widgets',
        pull_number: 7,
        event: 'REQUEST_CHANGES',
        comments: [{ path: 'src/foo.ts', line: 10, body: 'a finding' }],
      });
    });
  });

  describe('upsertSummary', () => {
    it('creates a new sticky comment with the hidden marker when none exists yet', async () => {
      const listAllComments = jest.fn().mockResolvedValue([]);
      const createComment = jest.fn().mockResolvedValue({});
      const client = fakeClient({
        issues: { listAllComments, createComment, updateComment: jest.fn() },
      });
      const port = new GitHubAppGitHubPort(client, {
        owner: 'acme',
        repo: 'widgets',
        pullNumber: 7,
        appSlug: 'ai-reviewer',
      });

      await port.upsertSummary('Verdict: **approve**');

      expect(listAllComments).toHaveBeenCalledWith({ owner: 'acme', repo: 'widgets', issue_number: 7 });
      expect(createComment).toHaveBeenCalledWith({
        owner: 'acme',
        repo: 'widgets',
        issue_number: 7,
        body: 'Verdict: **approve**\n\n<!-- ai-reviewer -->',
      });
    });

    it('updates the existing sticky comment in place instead of creating a duplicate', async () => {
      const listAllComments = jest.fn().mockResolvedValue([
        { id: 1, body: 'unrelated comment' },
        { id: 2, body: 'old summary\n\n<!-- ai-reviewer -->' },
      ]);
      const updateComment = jest.fn().mockResolvedValue({});
      const createComment = jest.fn();
      const client = fakeClient({
        issues: { listAllComments, createComment, updateComment },
      });
      const port = new GitHubAppGitHubPort(client, {
        owner: 'acme',
        repo: 'widgets',
        pullNumber: 7,
        appSlug: 'ai-reviewer',
      });

      await port.upsertSummary('Verdict: **comment**');

      expect(createComment).not.toHaveBeenCalled();
      expect(updateComment).toHaveBeenCalledWith({
        owner: 'acme',
        repo: 'widgets',
        comment_id: 2,
        body: 'Verdict: **comment**\n\n<!-- ai-reviewer -->',
      });
    });
  });
});

describe('createGitHubAppPort', () => {
  const ENV_VARS = [
    'GITHUB_APP_ID',
    'GITHUB_APP_PRIVATE_KEY',
    'GITHUB_APP_INSTALLATION_ID',
    'GITHUB_APP_SLUG',
  ] as const;
  const originalEnv = Object.fromEntries(ENV_VARS.map((key) => [key, process.env[key]]));

  afterEach(() => {
    for (const key of ENV_VARS) {
      const original = originalEnv[key];
      if (original === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original;
      }
    }
  });

  it('throws without reading or printing any value when a required env var is unset', () => {
    delete process.env.GITHUB_APP_ID;
    process.env.GITHUB_APP_PRIVATE_KEY = 'test-placeholder-key';
    process.env.GITHUB_APP_INSTALLATION_ID = '12345';
    process.env.GITHUB_APP_SLUG = 'ai-reviewer';

    expect(() => createGitHubAppPort({ owner: 'acme', repo: 'widgets', pullNumber: 7 })).toThrow(
      /GITHUB_APP_ID/,
    );
  });

  it('constructs a GitHubAppGitHubPort when all required env vars are set', () => {
    process.env.GITHUB_APP_ID = '1';
    process.env.GITHUB_APP_PRIVATE_KEY = 'test-placeholder-key';
    process.env.GITHUB_APP_INSTALLATION_ID = '12345';
    process.env.GITHUB_APP_SLUG = 'ai-reviewer';

    expect(createGitHubAppPort({ owner: 'acme', repo: 'widgets', pullNumber: 7 })).toBeInstanceOf(
      GitHubAppGitHubPort,
    );
  });
});
