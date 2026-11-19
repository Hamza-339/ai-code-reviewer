import { FakeReviewTrigger } from './fake-review-trigger';

describe('FakeReviewTrigger', () => {
  it('records each target it was triggered with', () => {
    const trigger = new FakeReviewTrigger();

    trigger.trigger({ owner: 'acme', repo: 'widgets', pullNumber: 1 });
    trigger.trigger({ owner: 'acme', repo: 'widgets', pullNumber: 2 });

    expect(trigger.targets).toEqual([
      { owner: 'acme', repo: 'widgets', pullNumber: 1 },
      { owner: 'acme', repo: 'widgets', pullNumber: 2 },
    ]);
  });
});
