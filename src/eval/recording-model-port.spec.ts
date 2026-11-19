import { RecordingModelPort } from './recording-model-port';
import { FakeModelPort } from '../ports/fakes/fake-model-port';
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

describe('RecordingModelPort', () => {
  it('delegates review() and countTokens() to the wrapped ModelPort while recording the raw Findings returned', async () => {
    const delegate = new FakeModelPort([[finding()]], (text) => text.length);
    const recorder = new RecordingModelPort(delegate);

    const findings = await recorder.review('a diff');
    const tokenCount = await recorder.countTokens('a diff');

    expect(findings).toEqual([finding()]);
    expect(tokenCount).toBe('a diff'.length);
    expect(recorder.findings).toEqual([finding()]);
  });

  it('accumulates recorded Findings across multiple review() calls', async () => {
    const other = finding({ path: 'src/bar.ts', line: 20 });
    const delegate = new FakeModelPort([[finding()], [other]]);
    const recorder = new RecordingModelPort(delegate);

    await recorder.review('first diff');
    await recorder.review('second diff');

    expect(recorder.findings).toEqual([finding(), other]);
  });
});
