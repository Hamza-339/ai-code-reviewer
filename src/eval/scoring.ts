import type { Finding } from '../domain/finding';
import type { SeededBug } from './types';

export interface FixtureScore {
  seededBugsTotal: number;
  caughtBugs: SeededBug[];
  catchFindings: Finding[];
  falseAlarmFindings: Finding[];
}

function matches(finding: Finding, bug: SeededBug): boolean {
  return (
    finding.path === bug.path &&
    finding.category === bug.category &&
    Math.abs(finding.line - bug.line) <= 3
  );
}

export function scoreFixture(seededBugs: SeededBug[], findings: Finding[]): FixtureScore {
  const matchedFindings = new Set<Finding>();
  const caughtBugs = seededBugs.filter((bug) => {
    const matchingFindings = findings.filter((finding) => matches(finding, bug));
    matchingFindings.forEach((finding) => matchedFindings.add(finding));
    return matchingFindings.length > 0;
  });

  // Nits are excluded from precision entirely (GLOSSARY.md: "False alarm"), so they
  // never register as a catch finding or a false alarm finding.
  const precisionFindings = findings.filter((finding) => finding.severity !== 'nit');
  const catchFindings = precisionFindings.filter((finding) => matchedFindings.has(finding));
  const falseAlarmFindings = precisionFindings.filter((finding) => !matchedFindings.has(finding));

  return { seededBugsTotal: seededBugs.length, caughtBugs, catchFindings, falseAlarmFindings };
}

export interface EvalReport {
  seededBugsTotal: number;
  seededBugsCaught: number;
  recall: number;
  precision: number;
  falseAlarmCount: number;
}

export function aggregateScores(scores: FixtureScore[]): EvalReport {
  const seededBugsTotal = scores.reduce((total, score) => total + score.seededBugsTotal, 0);
  const seededBugsCaught = scores.reduce((total, score) => total + score.caughtBugs.length, 0);
  const catchFindingsTotal = scores.reduce((total, score) => total + score.catchFindings.length, 0);
  const falseAlarmCount = scores.reduce((total, score) => total + score.falseAlarmFindings.length, 0);
  const precisionFindingsTotal = catchFindingsTotal + falseAlarmCount;

  return {
    seededBugsTotal,
    seededBugsCaught,
    recall: seededBugsCaught / seededBugsTotal,
    precision: precisionFindingsTotal === 0 ? 1 : catchFindingsTotal / precisionFindingsTotal,
    falseAlarmCount,
  };
}
