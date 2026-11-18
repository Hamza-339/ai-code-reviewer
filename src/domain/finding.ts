export const categories = ['bug', 'security', 'missing-test'] as const;
export type Category = (typeof categories)[number];

export const severities = ['blocker', 'warning', 'nit'] as const;
export type Severity = (typeof severities)[number];

export type Verdict = 'request-changes' | 'comment' | 'approve';

export interface Finding {
  path: string;
  /** Line number in the new (post-diff) version of the file. */
  line: number;
  category: Category;
  severity: Severity;
  explanation: string;
  suggestion?: string;
}
