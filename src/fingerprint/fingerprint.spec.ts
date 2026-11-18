import { computeFingerprint, dedupeFindings } from './fingerprint';
import type { Finding } from '../domain/finding';

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

describe('computeFingerprint', () => {
  it('returns the same fingerprint for the same path, category, and code', () => {
    const a = computeFingerprint('src/foo.ts', 'bug', 'const x = 1;');
    const b = computeFingerprint('src/foo.ts', 'bug', 'const x = 1;');

    expect(a).toBe(b);
  });

  it('returns the same fingerprint regardless of leading/trailing whitespace around the code', () => {
    const a = computeFingerprint('src/foo.ts', 'bug', 'const x = 1;');
    const b = computeFingerprint('src/foo.ts', 'bug', '  const x = 1;\n');

    expect(a).toBe(b);
  });

  it('returns a different fingerprint for different code', () => {
    const a = computeFingerprint('src/foo.ts', 'bug', 'const x = 1;');
    const b = computeFingerprint('src/foo.ts', 'bug', 'const x = 2;');

    expect(a).not.toBe(b);
  });

  it('returns a different fingerprint for a different path', () => {
    const a = computeFingerprint('src/foo.ts', 'bug', 'const x = 1;');
    const b = computeFingerprint('src/bar.ts', 'bug', 'const x = 1;');

    expect(a).not.toBe(b);
  });

  it('returns a different fingerprint for a different category', () => {
    const a = computeFingerprint('src/foo.ts', 'bug', 'const x = 1;');
    const b = computeFingerprint('src/foo.ts', 'security', 'const x = 1;');

    expect(a).not.toBe(b);
  });

  it('returns the same fingerprint regardless of CRLF vs LF line endings', () => {
    const a = computeFingerprint('src/foo.ts', 'bug', 'const x = 1;\nconst y = 2;');
    const b = computeFingerprint('src/foo.ts', 'bug', 'const x = 1;\r\nconst y = 2;');

    expect(a).toBe(b);
  });

  it('returns the same fingerprint regardless of internal run-of-whitespace differences', () => {
    const a = computeFingerprint('src/foo.ts', 'bug', 'const x  =   1;');
    const b = computeFingerprint('src/foo.ts', 'bug', 'const x = 1;');

    expect(a).toBe(b);
  });
});

describe('dedupeFindings', () => {
  it('returns an empty result for empty input', () => {
    const result = dedupeFindings([], new Set());

    expect(result).toEqual({ findings: [], discarded: 0 });
  });

  it('keeps a finding whose fingerprint is not already present', () => {
    const result = dedupeFindings(
      [{ finding: finding(), code: 'const x = 1;' }],
      new Set(),
    );

    expect(result).toEqual({ findings: [finding()], discarded: 0 });
  });

  it('skips a finding whose fingerprint is already present', () => {
    const existing = computeFingerprint('src/foo.ts', 'bug', 'const x = 1;');

    const result = dedupeFindings(
      [{ finding: finding(), code: 'const x = 1;' }],
      new Set([existing]),
    );

    expect(result).toEqual({ findings: [], discarded: 1 });
  });

  it('keeps new findings and skips already-present ones in the same batch', () => {
    const existing = computeFingerprint('src/foo.ts', 'bug', 'const x = 1;');
    const newFinding = finding({ path: 'src/bar.ts', line: 5 });

    const result = dedupeFindings(
      [
        { finding: finding(), code: 'const x = 1;' },
        { finding: newFinding, code: 'const y = 2;' },
      ],
      new Set([existing]),
    );

    expect(result).toEqual({ findings: [newFinding], discarded: 1 });
  });

  it('skips a finding whose offending code already exists, even after an unrelated edit shifts its line number', () => {
    const firstRunFinding = finding({ line: 10 });
    const existing = computeFingerprint(
      firstRunFinding.path,
      firstRunFinding.category,
      'const x = 1;',
    );

    const secondRunFinding = finding({ line: 17 });

    const result = dedupeFindings(
      [{ finding: secondRunFinding, code: 'const x = 1;' }],
      new Set([existing]),
    );

    expect(result).toEqual({ findings: [], discarded: 1 });
  });
});
