import { createClaudeModelPort } from '../ports/claude-model-port';
import { fixtures } from './fixtures';
import { runFixture } from './run-fixture';
import { aggregateScores, scoreFixture } from './scoring';

async function main(): Promise<void> {
  const model = createClaudeModelPort();

  const scores = [];
  for (const fixture of fixtures) {
    const { postedFindings } = await runFixture(fixture, model);
    const score = scoreFixture(fixture.seededBugs, postedFindings);
    scores.push(score);

    console.log(
      `${fixture.name}: ${score.caughtBugs.length}/${score.seededBugsTotal} caught, ` +
        `${score.falseAlarmFindings.length} false alarm(s)`,
    );
  }

  const report = aggregateScores(scores);

  console.log('');
  console.log('=== Eval report ===');
  console.log(`Recall:    ${(report.recall * 100).toFixed(1)}% (${report.seededBugsCaught}/${report.seededBugsTotal})`);
  console.log(`Precision: ${(report.precision * 100).toFixed(1)}%`);
  console.log(`False alarms: ${report.falseAlarmCount}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
