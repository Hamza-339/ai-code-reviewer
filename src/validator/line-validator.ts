import type { Finding } from '../domain/finding';
import type { ParsedDiffFile } from '../diff/parse-diff';

export interface ValidationResult {
  findings: Finding[];
  discarded: number;
}

export function validateFindings(
  findings: Finding[],
  diffFiles: ParsedDiffFile[],
): ValidationResult {
  const changedLinesByPath = new Map(diffFiles.map((file) => [file.path, file.changedLines]));

  const survivors: Finding[] = [];
  let discarded = 0;

  for (const finding of findings) {
    const changedLines = changedLinesByPath.get(finding.path);
    if (changedLines?.has(finding.line)) {
      survivors.push(finding);
    } else {
      discarded++;
    }
  }

  return { findings: survivors, discarded };
}
