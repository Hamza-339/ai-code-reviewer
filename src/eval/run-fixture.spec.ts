import { runFixture } from './run-fixture';
import { FakeModelPort } from '../ports/fakes/fake-model-port';
import type { Finding } from '../domain/finding';
import type { Fixture } from './types';

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    path: 'src/a.ts',
    line: 2,
    category: 'bug',
    severity: 'warning',
    explanation: 'explanation',
    ...overrides,
  };
}

const oneFileDiff = [
  'diff --git a/src/a.ts b/src/a.ts',
  'index abc123..def456 100644',
  '--- a/src/a.ts',
  '+++ b/src/a.ts',
  '@@ -1,2 +1,4 @@',
  ' line1',
  '+foo();',
  '+foo();',
  ' line3',
  '',
].join('\n');

function fixture(overrides: Partial<Fixture> = {}): Fixture {
  return { name: 'fixture', diff: oneFileDiff, seededBugs: [], ...overrides };
}

describe('runFixture', () => {
  it('replays a Fixture through the Review Core and returns the posted Findings with Category and Severity restored', async () => {
    const model = new FakeModelPort([[finding()]]);

    const result = await runFixture(fixture(), model);

    expect(result.postedFindings).toEqual([finding()]);
  });

  it('omits a raw Finding that the Review Core discarded (off a Changed line) from the posted Findings', async () => {
    const model = new FakeModelPort([[finding({ line: 99 })]]);

    const result = await runFixture(fixture(), model);

    expect(result.postedFindings).toEqual([]);
  });

  it('attributes two posted comments on the same path and line to two distinct raw Findings, not the same one twice', async () => {
    const bugFinding = finding({ category: 'bug' });
    const securityFinding = finding({ category: 'security' });
    const model = new FakeModelPort([[bugFinding, securityFinding]]);

    const result = await runFixture(fixture(), model);

    expect(result.postedFindings).toEqual([bugFinding, securityFinding]);
  });
});
