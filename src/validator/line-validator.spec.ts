import { validateFindings } from './line-validator';
import type { Finding } from '../domain/finding';
import type { ParsedDiffFile } from '../diff/parse-diff';

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    path: 'src/foo.ts',
    line: 10,
    category: 'bug',
    severity: 'warning',
    explanation: 'explanation',
    ...overrides,
  };
}

function diffFile(path: string, changedLines: number[]): ParsedDiffFile {
  return { path, changedLines: new Set(changedLines), rendered: '' };
}

describe('validateFindings', () => {
  it('keeps a finding on a changed line', () => {
    const result = validateFindings([finding({ line: 10 })], [diffFile('src/foo.ts', [10])]);

    expect(result.findings).toEqual([finding({ line: 10 })]);
  });

  it('discards a finding whose line is not a changed line', () => {
    const result = validateFindings([finding({ line: 99 })], [diffFile('src/foo.ts', [10])]);

    expect(result.findings).toEqual([]);
    expect(result.discarded).toBe(1);
  });

  it('discards a finding for a path not present in the diff', () => {
    const result = validateFindings(
      [finding({ path: 'src/missing.ts', line: 10 })],
      [diffFile('src/foo.ts', [10])],
    );

    expect(result.findings).toEqual([]);
    expect(result.discarded).toBe(1);
  });

  it('validates per path: a line changed in one file does not validate a finding in another', () => {
    const result = validateFindings(
      [finding({ path: 'src/bar.ts', line: 10 })],
      [diffFile('src/foo.ts', [10]), diffFile('src/bar.ts', [20])],
    );

    expect(result.findings).toEqual([]);
    expect(result.discarded).toBe(1);
  });

  it('counts discards across a mix of surviving and discarded findings', () => {
    const result = validateFindings(
      [
        finding({ path: 'src/foo.ts', line: 10 }),
        finding({ path: 'src/foo.ts', line: 99 }),
        finding({ path: 'src/bar.ts', line: 20 }),
        finding({ path: 'src/missing.ts', line: 1 }),
      ],
      [diffFile('src/foo.ts', [10]), diffFile('src/bar.ts', [20])],
    );

    expect(result.findings).toEqual([
      finding({ path: 'src/foo.ts', line: 10 }),
      finding({ path: 'src/bar.ts', line: 20 }),
    ]);
    expect(result.discarded).toBe(2);
  });
});
