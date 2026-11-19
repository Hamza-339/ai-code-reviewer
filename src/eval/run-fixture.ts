import { runReview } from '../core/review-core';
import { InMemoryGitHubPort } from '../ports/fakes/in-memory-github-port';
import { RecordingModelPort } from './recording-model-port';
import type { ModelPort } from '../ports/model-port';
import type { Finding } from '../domain/finding';
import type { Fixture } from './types';

export interface FixtureRunResult {
  fixture: Fixture;
  postedFindings: Finding[];
}

export async function runFixture(fixture: Fixture, modelPort: ModelPort): Promise<FixtureRunResult> {
  const recorder = new RecordingModelPort(modelPort);
  const github = new InMemoryGitHubPort(fixture.diff);

  await runReview(github, recorder);

  // Posted comments are matched in order against a shrinking pool of raw findings,
  // so two findings sharing a path+line (e.g. differing only by Category) are each
  // attributed once rather than both resolving to the first match.
  const unmatchedFindings = [...recorder.findings];
  const postedFindings: Finding[] = [];
  for (const comment of github.postedReviews.flatMap((review) => review.comments)) {
    const index = unmatchedFindings.findIndex(
      (finding) => finding.path === comment.path && finding.line === comment.line,
    );
    if (index === -1) {
      continue;
    }
    const [matched] = unmatchedFindings.splice(index, 1);
    if (matched) {
      postedFindings.push(matched);
    }
  }

  return { fixture, postedFindings };
}
