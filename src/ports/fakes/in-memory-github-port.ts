import type { GitHubPort, OwnComment, ReviewSubmission } from '../github-port';

export class InMemoryGitHubPort implements GitHubPort {
  private readonly ownComments: OwnComment[];
  readonly postedReviews: ReviewSubmission[] = [];
  summary: string | null = null;

  constructor(
    private readonly diff: string,
    existingComments: OwnComment[] = [],
  ) {
    this.ownComments = [...existingComments];
  }

  fetchDiff(): Promise<string> {
    return Promise.resolve(this.diff);
  }

  listOwnComments(): Promise<OwnComment[]> {
    return Promise.resolve(this.ownComments);
  }

  postReview(review: ReviewSubmission): Promise<void> {
    this.postedReviews.push(review);
    review.comments.forEach((comment, index) => {
      this.ownComments.push({
        id: `review-${this.postedReviews.length}-${index}`,
        body: comment.body,
      });
    });
    return Promise.resolve();
  }

  upsertSummary(body: string): Promise<void> {
    this.summary = body;
    return Promise.resolve();
  }
}
