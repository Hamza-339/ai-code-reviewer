import { aggregateScores, scoreFixture } from './scoring';
import type { Finding } from '../domain/finding';
import type { SeededBug } from './types';

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

function bug(overrides: Partial<SeededBug> = {}): SeededBug {
  return { path: 'src/foo.ts', line: 10, category: 'bug', ...overrides };
}

describe('scoreFixture', () => {
  it('counts a Finding matching a Seeded bug on the same line and Category as a caught bug and a catch finding', () => {
    const score = scoreFixture([bug()], [finding()]);

    expect(score.caughtBugs).toEqual([bug()]);
    expect(score.catchFindings).toEqual([finding()]);
    expect(score.falseAlarmFindings).toEqual([]);
  });

  it('still counts a Finding 3 lines away from the labeled line as a catch', () => {
    const score = scoreFixture([bug({ line: 10 })], [finding({ line: 13 })]);

    expect(score.caughtBugs).toEqual([bug({ line: 10 })]);
    expect(score.catchFindings).toEqual([finding({ line: 13 })]);
  });

  it('treats a Finding more than 3 lines from the labeled line as a false alarm, not a catch', () => {
    const score = scoreFixture([bug({ line: 10 })], [finding({ line: 14 })]);

    expect(score.caughtBugs).toEqual([]);
    expect(score.catchFindings).toEqual([]);
    expect(score.falseAlarmFindings).toEqual([finding({ line: 14 })]);
  });

  it('treats a Finding on the labeled line with a different Category as a false alarm, not a catch', () => {
    const score = scoreFixture(
      [bug({ category: 'bug' })],
      [finding({ category: 'security' })],
    );

    expect(score.caughtBugs).toEqual([]);
    expect(score.falseAlarmFindings).toEqual([finding({ category: 'security' })]);
  });

  it('excludes a nit Finding matching no Seeded bug from false alarms, per the glossary rule that nits are excluded from precision', () => {
    const score = scoreFixture([], [finding({ severity: 'nit' })]);

    expect(score.falseAlarmFindings).toEqual([]);
  });

  it('counts a blocker/warning Finding on a Decoy fixture (no Seeded bugs) as a false alarm', () => {
    const score = scoreFixture([], [finding({ severity: 'blocker' })]);

    expect(score.caughtBugs).toEqual([]);
    expect(score.catchFindings).toEqual([]);
    expect(score.falseAlarmFindings).toEqual([finding({ severity: 'blocker' })]);
  });
});

describe('aggregateScores', () => {
  it('reports recall as the fraction of Seeded bugs caught and precision as the fraction of precision-eligible Findings that are catches, across fixtures', () => {
    const caughtBug = bug({ path: 'src/a.ts' });
    const uncaughtBug = bug({ path: 'src/b.ts' });
    const catchFinding = finding({ path: 'src/a.ts' });
    const falseAlarmFinding = finding({ path: 'src/c.ts', severity: 'blocker' });

    const report = aggregateScores([
      scoreFixture([caughtBug], [catchFinding]),
      scoreFixture([uncaughtBug], [falseAlarmFinding]),
    ]);

    expect(report.seededBugsTotal).toBe(2);
    expect(report.seededBugsCaught).toBe(1);
    expect(report.recall).toBe(0.5);
    expect(report.falseAlarmCount).toBe(1);
    expect(report.precision).toBe(0.5);
  });

  it('reports a precision of 1 when there are no precision-eligible Findings at all, across fixtures', () => {
    const report = aggregateScores([scoreFixture([bug()], [])]);

    expect(report.precision).toBe(1);
  });
});
