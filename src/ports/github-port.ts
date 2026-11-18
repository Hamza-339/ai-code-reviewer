export type ReviewEvent = 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';

export interface InlineComment {
  path: string;
  /** Line number in the new (post-diff) version of the file. */
  line: number;
  body: string;
}

export interface ReviewSubmission {
  event: ReviewEvent;
  comments: InlineComment[];
}

export interface OwnComment {
  id: string;
  body: string;
}

export interface GitHubPort {
  fetchDiff(): Promise<string>;
  listOwnComments(): Promise<OwnComment[]>;
  postReview(review: ReviewSubmission): Promise<void>;
  upsertSummary(body: string): Promise<void>;
}
