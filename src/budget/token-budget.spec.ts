import { selectWithinBudget } from './token-budget';

interface TestFile {
  rendered: string;
}

const charCountTokenizer = (text: string): number => text.length;
const getText = (file: TestFile): string => file.rendered;

describe('selectWithinBudget', () => {
  it('selects every file when the total is under budget', () => {
    const files: TestFile[] = [{ rendered: 'aaa' }, { rendered: 'bbb' }];

    const result = selectWithinBudget(files, getText, charCountTokenizer, 100);

    expect(result).toEqual({ files, truncated: false });
  });

  it('selects a deterministic prefix and reports truncated when over budget', () => {
    const files: TestFile[] = [{ rendered: 'aaaa' }, { rendered: 'bb' }, { rendered: 'cccccc' }];

    const result = selectWithinBudget(files, getText, charCountTokenizer, 6);

    expect(result).toEqual({ files: [files[0], files[1]], truncated: true });
  });

  it('includes a file whose running total lands exactly on the budget', () => {
    const files: TestFile[] = [{ rendered: 'aaa' }, { rendered: 'bbb' }];

    const result = selectWithinBudget(files, getText, charCountTokenizer, 6);

    expect(result).toEqual({ files, truncated: false });
  });

  it('excludes everything and reports truncated when the first file alone exceeds the budget', () => {
    const files: TestFile[] = [{ rendered: 'aaaaaaaaaa' }, { rendered: 'b' }];

    const result = selectWithinBudget(files, getText, charCountTokenizer, 5);

    expect(result).toEqual({ files: [], truncated: true });
  });

  it('returns an empty, non-truncated selection for an empty file list', () => {
    const result = selectWithinBudget([], getText, charCountTokenizer, 100);

    expect(result).toEqual({ files: [], truncated: false });
  });
});
