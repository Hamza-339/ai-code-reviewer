import { shouldReview } from './file-filter';

describe('shouldReview', () => {
  it('excludes lockfiles', () => {
    expect(shouldReview({ path: 'package-lock.json', patch: '@@ -1 +1 @@' })).toBe(false);
    expect(shouldReview({ path: 'yarn.lock', patch: '@@ -1 +1 @@' })).toBe(false);
    expect(shouldReview({ path: 'pnpm-lock.yaml', patch: '@@ -1 +1 @@' })).toBe(false);
    expect(shouldReview({ path: 'Cargo.lock', patch: '@@ -1 +1 @@' })).toBe(false);
  });

  it('excludes generated/vendored paths', () => {
    expect(shouldReview({ path: 'dist/index.js', patch: '@@ -1 +1 @@' })).toBe(false);
    expect(shouldReview({ path: 'build/main.js', patch: '@@ -1 +1 @@' })).toBe(false);
    expect(shouldReview({ path: 'vendor/lib/foo.php', patch: '@@ -1 +1 @@' })).toBe(false);
    expect(shouldReview({ path: 'public/app.min.js', patch: '@@ -1 +1 @@' })).toBe(false);
    expect(
      shouldReview({ path: 'src/__snapshots__/foo.spec.ts.snap', patch: '@@ -1 +1 @@' }),
    ).toBe(false);
  });

  it('excludes binary files with no textual patch', () => {
    expect(shouldReview({ path: 'assets/logo.png' })).toBe(false);
  });

  it('keeps an ordinary source file', () => {
    expect(shouldReview({ path: 'src/foo.ts', patch: '@@ -1 +1 @@' })).toBe(true);
  });

  it('matches excluded categories case-insensitively', () => {
    expect(shouldReview({ path: 'DIST/bundle.js', patch: '@@ -1 +1 @@' })).toBe(false);
    expect(shouldReview({ path: 'Vendor/foo.php', patch: '@@ -1 +1 @@' })).toBe(false);
    expect(shouldReview({ path: 'App.MIN.js', patch: '@@ -1 +1 @@' })).toBe(false);
  });
});
