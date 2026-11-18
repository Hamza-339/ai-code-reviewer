export type TokenCounter = (text: string) => number;

export const DEFAULT_TOKEN_BUDGET = 40_000;

export interface BudgetSelection<T> {
  files: T[];
  truncated: boolean;
}

export function selectWithinBudget<T>(
  files: T[],
  getText: (file: T) => string,
  countTokens: TokenCounter,
  budget: number = DEFAULT_TOKEN_BUDGET,
): BudgetSelection<T> {
  const selected: T[] = [];
  let used = 0;
  let truncated = false;

  for (const file of files) {
    const tokens = countTokens(getText(file));
    if (used + tokens > budget) {
      truncated = true;
      break;
    }
    selected.push(file);
    used += tokens;
  }

  return { files: selected, truncated };
}
