import type { PullRequestTarget } from './github-port';

export interface ReviewTrigger {
  trigger(target: PullRequestTarget): void;
}
