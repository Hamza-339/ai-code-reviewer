import type { Finding, Verdict } from '../domain/finding';

export function computeVerdict(findings: Finding[]): Verdict {
  if (findings.some((finding) => finding.severity === 'blocker')) {
    return 'request-changes';
  }
  if (findings.some((finding) => finding.severity === 'warning')) {
    return 'comment';
  }
  return 'approve';
}
