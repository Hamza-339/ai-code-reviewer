import Ajv from 'ajv';
import { findingsResponseSchema } from './finding-schema';

describe('findingsResponseSchema', () => {
  const ajv = new Ajv();
  const validate = ajv.compile(findingsResponseSchema);

  it('accepts a valid findings[] payload', () => {
    const payload = {
      findings: [
        {
          path: 'src/foo.ts',
          line: 12,
          category: 'bug',
          severity: 'blocker',
          explanation: 'Off-by-one error in the loop bound.',
          suggestion: 'Use `<` instead of `<=`.',
        },
      ],
    };

    expect(validate(payload)).toBe(true);
  });

  it('rejects a payload with an unknown property on a finding', () => {
    const payload = {
      findings: [
        {
          path: 'src/foo.ts',
          line: 12,
          category: 'bug',
          severity: 'blocker',
          explanation: 'Off-by-one error in the loop bound.',
          confidence: 0.9,
        },
      ],
    };

    expect(validate(payload)).toBe(false);
  });

  it('rejects a payload with a verdict field at the top level', () => {
    const payload = {
      findings: [],
      verdict: 'approve',
    };

    expect(validate(payload)).toBe(false);
  });
});
