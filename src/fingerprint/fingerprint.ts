import { createHash } from 'crypto';
import type { Category, Finding } from '../domain/finding';

export interface DedupeResult {
  findings: Finding[];
  discarded: number;
}

function normalizeCode(code: string): string {
  return code
    .replace(/\r\n/g, '\n')
    .trim()
    .replace(/[ \t]+/g, ' ');
}

export function computeFingerprint(path: string, category: Category, code: string): string {
  const codeHash = createHash('sha256').update(normalizeCode(code)).digest('hex');
  return `${path}:${category}:${codeHash}`;
}

export function dedupeFindings(
  items: { finding: Finding; code: string }[],
  existingFingerprints: ReadonlySet<string>,
): DedupeResult {
  const findings: Finding[] = [];
  let discarded = 0;

  for (const item of items) {
    const fingerprint = computeFingerprint(item.finding.path, item.finding.category, item.code);
    if (existingFingerprints.has(fingerprint)) {
      discarded++;
    } else {
      findings.push(item.finding);
    }
  }

  return { findings, discarded };
}
