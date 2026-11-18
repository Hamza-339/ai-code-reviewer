import { parseDiff } from './parse-diff';

const fixture = [
  'diff --git a/src/a.ts b/src/a.ts',
  'index abc123..def456 100644',
  '--- a/src/a.ts',
  '+++ b/src/a.ts',
  '@@ -1,4 +1,5 @@',
  ' line1',
  '-line2',
  '+line2 modified',
  '+line2b new',
  ' line3',
  ' line4',
  '@@ -10,3 +11,3 @@',
  ' line10',
  '-line11',
  '+line11 modified',
  ' line12',
  'diff --git a/src/b.ts b/src/b.ts',
  'index 111..222 100644',
  '--- a/src/b.ts',
  '+++ b/src/b.ts',
  '@@ -1,2 +1,3 @@',
  ' first',
  '+second',
  ' third',
  '',
].join('\n');

describe('parseDiff', () => {
  it('computes the changed-line set per path for a multi-hunk, multi-file diff', () => {
    const files = parseDiff(fixture);

    const a = files.find((f) => f.path === 'src/a.ts');
    const b = files.find((f) => f.path === 'src/b.ts');

    expect(a?.changedLines).toEqual(new Set([2, 3, 12]));
    expect(b?.changedLines).toEqual(new Set([2]));
  });

  it('renders each hunk with explicit new-file line numbers', () => {
    const files = parseDiff(fixture);
    const a = files.find((f) => f.path === 'src/a.ts');

    expect(a?.rendered).toBe(
      [
        '@@ -1,4 +1,5 @@',
        '1\t line1',
        '\t-line2',
        '2\t+line2 modified',
        '3\t+line2b new',
        '4\t line3',
        '5\t line4',
        '@@ -10,3 +11,3 @@',
        '11\t line10',
        '\t-line11',
        '12\t+line11 modified',
        '13\t line12',
      ].join('\n'),
    );
  });

  it('keeps the real path for a deleted file, not /dev/null', () => {
    const deletion = [
      'diff --git a/src/c.ts b/src/c.ts',
      'index 333..0000000',
      '--- a/src/c.ts',
      '+++ /dev/null',
      '@@ -1,2 +0,0 @@',
      '-old line 1',
      '-old line 2',
      '',
    ].join('\n');

    const files = parseDiff(deletion);
    const c = files.find((f) => f.path === 'src/c.ts');

    expect(c).toBeDefined();
    expect(c?.changedLines).toEqual(new Set());
  });
});
