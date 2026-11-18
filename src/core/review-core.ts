import type { GitHubPort, InlineComment, ReviewEvent } from '../ports/github-port';
import type { ModelPort } from '../ports/model-port';
import type { Finding, Verdict } from '../domain/finding';
import { parseDiff, getCodeAtLine } from '../diff/parse-diff';
import { shouldReview } from '../filter/file-filter';
import { selectWithinBudget, DEFAULT_TOKEN_BUDGET } from '../budget/token-budget';
import { validateFindings } from '../validator/line-validator';
import { computeFingerprint, dedupeFindings } from '../fingerprint/fingerprint';
import { computeVerdict } from '../verdict/verdict';

const VERDICT_TO_EVENT: Record<Verdict, ReviewEvent> = {
  'request-changes': 'REQUEST_CHANGES',
  comment: 'COMMENT',
  approve: 'APPROVE',
};

const FINGERPRINT_MARKER = /<!-- fingerprint: (\S+) -->/;

function embedFingerprint(body: string, fingerprint: string): string {
  return `${body}\n\n<!-- fingerprint: ${fingerprint} -->`;
}

function extractFingerprint(body: string): string | null {
  return FINGERPRINT_MARKER.exec(body)?.[1] ?? null;
}

export interface RunReviewOptions {
  tokenBudget?: number;
}

export async function runReview(
  github: GitHubPort,
  model: ModelPort,
  options: RunReviewOptions = {},
): Promise<void> {
  const diffText = await github.fetchDiff();
  const parsedFiles = parseDiff(diffText);
  const reviewableFiles = parsedFiles.filter((file) =>
    shouldReview({ path: file.path, patch: file.rendered }),
  );

  const { files: diffFiles, truncated } = selectWithinBudget(
    reviewableFiles,
    (file) => file.rendered,
    (text) => model.countTokens(text),
    options.tokenBudget ?? DEFAULT_TOKEN_BUDGET,
  );
  const filesByPath = new Map(diffFiles.map((file) => [file.path, file]));

  const renderedDiff = diffFiles.map((file) => file.rendered).join('\n\n');
  const rawFindings = await model.review(renderedDiff);

  const { findings: validFindings } = validateFindings(rawFindings, diffFiles);

  // Verdict reflects every unresolved Finding, not just the ones freshly posted this
  // run (ADR-0003) — so it's computed before dedup, from validFindings.
  const verdict = computeVerdict(validFindings);

  const existingComments = await github.listOwnComments();
  const existingFingerprints = new Set(
    existingComments
      .map((comment) => extractFingerprint(comment.body))
      .filter((fingerprint): fingerprint is string => fingerprint !== null),
  );

  const codeByFinding = new Map(
    validFindings.map((finding: Finding) => {
      const file = filesByPath.get(finding.path);
      return [finding, file ? getCodeAtLine(file, finding.line) : ''] as const;
    }),
  );
  const dedupeItems = validFindings.map((finding) => ({
    finding,
    code: codeByFinding.get(finding) ?? '',
  }));
  const { findings: freshFindings } = dedupeFindings(dedupeItems, existingFingerprints);

  const comments: InlineComment[] = freshFindings.map((finding) => {
    const code = codeByFinding.get(finding) ?? '';
    const fingerprint = computeFingerprint(finding.path, finding.category, code);
    return {
      path: finding.path,
      line: finding.line,
      body: embedFingerprint(finding.explanation, fingerprint),
    };
  });

  await github.postReview({ event: VERDICT_TO_EVENT[verdict], comments });

  const summaryLines = [`Verdict: **${verdict}**`, '', `${comments.length} finding(s) posted.`];
  if (truncated) {
    summaryLines.push('', '_This review was truncated: the diff exceeded the token budget._');
  }
  await github.upsertSummary(summaryLines.join('\n'));
}
