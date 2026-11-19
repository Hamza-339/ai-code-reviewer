import { VercelReviewTrigger } from './vercel-review-trigger';
import { InMemoryGitHubPort } from '../ports/fakes/in-memory-github-port';
import { FakeModelPort } from '../ports/fakes/fake-model-port';
import type { PullRequestTarget } from '../ports/github-port';

const TARGET: PullRequestTarget = { owner: 'acme', repo: 'widgets', pullNumber: 42 };

function waitUntilMock() {
  return jest.fn<void, [Promise<unknown>]>();
}

describe('VercelReviewTrigger', () => {
  it('constructs the ports via the injected factories and hands a promise to waitUntil', () => {
    const github = new InMemoryGitHubPort('fixture diff');
    const model = new FakeModelPort([[]]);
    const createGitHubPort = jest.fn().mockReturnValue(github);
    const createModelPort = jest.fn().mockReturnValue(model);
    const waitUntil = waitUntilMock();
    const trigger = new VercelReviewTrigger({ waitUntil, createGitHubPort, createModelPort });

    trigger.trigger(TARGET);

    expect(createGitHubPort).toHaveBeenCalledWith(TARGET);
    expect(createModelPort).toHaveBeenCalledWith();
    expect(waitUntil).toHaveBeenCalledTimes(1);
    expect(waitUntil.mock.calls[0]![0]).toBeInstanceOf(Promise);
  });

  it('runs a real review against the constructed ports once the waitUntil promise is awaited', async () => {
    const diff = [
      'diff --git a/src/a.ts b/src/a.ts',
      'index abc123..def456 100644',
      '--- a/src/a.ts',
      '+++ b/src/a.ts',
      '@@ -1,2 +1,2 @@',
      ' line1',
      '-line2',
      '+line2 modified',
      '',
    ].join('\n');
    const github = new InMemoryGitHubPort(diff);
    const model = new FakeModelPort([[]]);
    const waitUntil = waitUntilMock();
    const trigger = new VercelReviewTrigger({
      waitUntil,
      createGitHubPort: () => github,
      createModelPort: () => model,
    });

    trigger.trigger(TARGET);
    await waitUntil.mock.calls[0]![0];

    expect(github.postedReviews).toHaveLength(1);
    expect(github.summary).not.toBeNull();
  });

  it('never throws synchronously when createGitHubPort throws, and logs the failure instead', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const waitUntil = waitUntilMock();
    const trigger = new VercelReviewTrigger({
      waitUntil,
      createGitHubPort: () => {
        throw new Error('GITHUB_APP_ID environment variable is required');
      },
      createModelPort: () => new FakeModelPort([[]]),
    });

    expect(() => trigger.trigger(TARGET)).not.toThrow();
    await expect(waitUntil.mock.calls[0]![0]).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it('never throws synchronously when runReview itself rejects, and logs the failure instead', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const github = new InMemoryGitHubPort('diff');
    const failingModel = {
      review: () => Promise.reject(new Error('model unavailable')),
      countTokens: () => Promise.resolve(0),
    };
    const waitUntil = waitUntilMock();
    const trigger = new VercelReviewTrigger({
      waitUntil,
      createGitHubPort: () => github,
      createModelPort: () => failingModel,
    });

    expect(() => trigger.trigger(TARGET)).not.toThrow();
    await expect(waitUntil.mock.calls[0]![0]).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });
});
