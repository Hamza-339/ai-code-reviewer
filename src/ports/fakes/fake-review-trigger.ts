import type { ReviewTrigger } from '../review-trigger';
import type { PullRequestTarget } from '../github-port';

export class FakeReviewTrigger implements ReviewTrigger {
  readonly targets: PullRequestTarget[] = [];

  trigger(target: PullRequestTarget): void {
    this.targets.push(target);
  }
}
