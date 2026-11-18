import { FakeModelPort } from './fake-model-port';
import type { Finding } from '../../domain/finding';

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

describe('FakeModelPort', () => {
  describe('review', () => {
    it('returns the recorded response for the first call', async () => {
      const response = [finding()];
      const port = new FakeModelPort([response]);

      const result = await port.review('rendered diff');

      expect(result).toBe(response);
    });

    it('returns the recorded response matching the call index on later calls', async () => {
      const first = [finding()];
      const second = [finding({ path: 'src/bar.ts' })];
      const port = new FakeModelPort([first, second]);

      await port.review('first diff');
      const result = await port.review('second diff');

      expect(result).toBe(second);
    });

    it('records each rendered diff it was called with', async () => {
      const port = new FakeModelPort([[], []]);

      await port.review('first diff');
      await port.review('second diff');

      expect(port.requests).toEqual(['first diff', 'second diff']);
    });
  });

  describe('countTokens', () => {
    it('returns the configured counter result for the given text', () => {
      const port = new FakeModelPort([], (text) => text.length);

      expect(port.countTokens('abcde')).toBe(5);
    });
  });
});
