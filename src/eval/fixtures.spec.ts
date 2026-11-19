import { parseDiff } from '../diff/parse-diff';
import { fixtures } from './fixtures';
import { categories } from '../domain/finding';

describe('fixtures', () => {
  it('has between 10 and 12 fixtures', () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(10);
    expect(fixtures.length).toBeLessThanOrEqual(12);
  });

  it('has at least 2 Decoy fixtures (no seeded bugs)', () => {
    const decoys = fixtures.filter((fixture) => fixture.seededBugs.length === 0);
    expect(decoys.length).toBeGreaterThanOrEqual(2);
  });

  it('covers every Category with at least one seeded bug', () => {
    const coveredCategories = new Set(fixtures.flatMap((f) => f.seededBugs.map((b) => b.category)));
    for (const category of categories) {
      expect(coveredCategories.has(category)).toBe(true);
    }
  });

  it('places every seeded bug on a Changed line of its fixture diff', () => {
    for (const fixture of fixtures) {
      const files = parseDiff(fixture.diff);
      for (const bug of fixture.seededBugs) {
        const file = files.find((f) => f.path === bug.path);
        expect(file?.changedLines.has(bug.line)).toBe(true);
      }
    }
  });

  it('has unique fixture names', () => {
    const names = fixtures.map((fixture) => fixture.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
