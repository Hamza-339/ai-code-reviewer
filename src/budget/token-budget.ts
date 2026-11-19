export type TokenCounter = (text: string) => Promise<number>;

export const DEFAULT_TOKEN_BUDGET = 40_000;

export interface BudgetSelection<T> {
  files: T[];
  truncated: boolean;
}

export async function selectWithinBudget<T>(
  files: T[],
  getText: (file: T) => string,
  countTokens: TokenCounter,
  budget: number = DEFAULT_TOKEN_BUDGET,
): Promise<BudgetSelection<T>> {
  const selected: T[] = [];
  let used = 0;
  let truncated = false;

  for (const file of files) {
    const tokens = await countTokens(getText(file));
    if (used + tokens > budget) {
      truncated = true;
      break;
    }
    selected.push(file);
    used += tokens;
  }

  return { files: selected, truncated };
}
