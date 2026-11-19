import { Octokit } from '@octokit/rest';
import { createAppAuth } from '@octokit/auth-app';
import type { GitHubPort, OwnComment, PullRequestTarget, ReviewSubmission } from './github-port';

interface GitHubReviewComment {
  id: number;
  body: string;
  user: { login: string } | null;
}

interface GitHubIssueComment {
  id: number;
  body?: string | null;
}

export interface GitHubClient {
  pulls: {
    get(params: {
      owner: string;
      repo: string;
      pull_number: number;
      mediaType: { format: 'diff' };
    }): Promise<{ data: string }>;
    listAllReviewComments(params: {
      owner: string;
      repo: string;
      pull_number: number;
    }): Promise<GitHubReviewComment[]>;
    createReview(params: {
      owner: string;
      repo: string;
      pull_number: number;
      event: string;
      comments: { path: string; line: number; body: string }[];
    }): Promise<unknown>;
  };
  issues: {
    listAllComments(params: {
      owner: string;
      repo: string;
      issue_number: number;
    }): Promise<GitHubIssueComment[]>;
    createComment(params: { owner: string; repo: string; issue_number: number; body: string }): Promise<unknown>;
    updateComment(params: { owner: string; repo: string; comment_id: number; body: string }): Promise<unknown>;
  };
}

const SUMMARY_MARKER = '<!-- ai-reviewer -->';

export interface GitHubAppGitHubPortTarget extends PullRequestTarget {
  appSlug: string;
}

export class GitHubAppGitHubPort implements GitHubPort {
  constructor(
    private readonly client: GitHubClient,
    private readonly target: GitHubAppGitHubPortTarget,
  ) {}

  async fetchDiff(): Promise<string> {
    const { owner, repo, pullNumber } = this.target;
    const response = await this.client.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
      mediaType: { format: 'diff' },
    });
    return response.data;
  }

  async listOwnComments(): Promise<OwnComment[]> {
    const { owner, repo, pullNumber, appSlug } = this.target;
    const botLogin = `${appSlug}[bot]`;
    const comments = await this.client.pulls.listAllReviewComments({ owner, repo, pull_number: pullNumber });
    return comments
      .filter((comment) => comment.user?.login === botLogin)
      .map((comment) => ({ id: String(comment.id), body: comment.body }));
  }

  async postReview(review: ReviewSubmission): Promise<void> {
    const { owner, repo, pullNumber } = this.target;
    await this.client.pulls.createReview({
      owner,
      repo,
      pull_number: pullNumber,
      event: review.event,
      comments: review.comments,
    });
  }

  async upsertSummary(body: string): Promise<void> {
    const { owner, repo, pullNumber } = this.target;
    const markedBody = `${body}\n\n${SUMMARY_MARKER}`;
    const comments = await this.client.issues.listAllComments({ owner, repo, issue_number: pullNumber });
    const existing = comments.find((comment) => comment.body?.includes(SUMMARY_MARKER));

    if (existing) {
      await this.client.issues.updateComment({ owner, repo, comment_id: existing.id, body: markedBody });
    } else {
      await this.client.issues.createComment({ owner, repo, issue_number: pullNumber, body: markedBody });
    }
  }
}

interface GitHubAppCredentials {
  appId: string;
  privateKey: string;
  installationId: string;
  appSlug: string;
}

function readGitHubAppCredentials(): GitHubAppCredentials {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
  const installationId = process.env.GITHUB_APP_INSTALLATION_ID;
  const appSlug = process.env.GITHUB_APP_SLUG;

  if (!appId || !privateKey || !installationId || !appSlug) {
    throw new Error(
      'GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, GITHUB_APP_INSTALLATION_ID, and GITHUB_APP_SLUG environment variables are required',
    );
  }

  return { appId, privateKey, installationId, appSlug };
}

type PaginateAny = (route: unknown, params: unknown) => Promise<unknown>;

// Octokit's REST methods paginate at 30 results/page; listAllReviewComments and
// listAllComments must walk every page so a PR with many comments doesn't silently
// drop old ones from the App's own-comment set (breaking dedupe) or the sticky-summary
// lookup.
function toGitHubClient(octokit: Octokit): GitHubClient {
  const paginate = octokit.paginate as unknown as PaginateAny;
  return {
    pulls: {
      get: (params) => octokit.rest.pulls.get(params) as unknown as Promise<{ data: string }>,
      listAllReviewComments: (params) =>
        paginate(octokit.rest.pulls.listReviewComments, params) as Promise<GitHubReviewComment[]>,
      createReview: (params) => octokit.rest.pulls.createReview(params as never),
    },
    issues: {
      listAllComments: (params) =>
        paginate(octokit.rest.issues.listComments, params) as Promise<GitHubIssueComment[]>,
      createComment: (params) => octokit.rest.issues.createComment(params),
      updateComment: (params) => octokit.rest.issues.updateComment(params),
    },
  };
}

export function createGitHubAppPort(target: PullRequestTarget): GitHubAppGitHubPort {
  const credentials = readGitHubAppCredentials();
  const octokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: credentials.appId,
      privateKey: credentials.privateKey,
      installationId: credentials.installationId,
    },
  });

  return new GitHubAppGitHubPort(toGitHubClient(octokit), {
    ...target,
    appSlug: credentials.appSlug,
  });
}
