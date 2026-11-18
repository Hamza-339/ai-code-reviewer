import { computeVerdict } from './verdict';
import type { Finding } from '../domain/finding';

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    path: 'src/foo.ts',
    line: 10,
    category: 'bug',
    severity: 'nit',
    explanation: 'explanation',
    ...overrides,
  };
}

describe('computeVerdict', () => {
  it('returns approve when there are no findings', () => {
    expect(computeVerdict([])).toBe('approve');
  });

  it('returns approve when all findings are nits', () => {
    expect(computeVerdict([finding({ severity: 'nit' }), finding({ severity: 'nit' })])).toBe(
      'approve',
    );
  });

  it('returns comment for a warning alone', () => {
    expect(computeVerdict([finding({ severity: 'warning' })])).toBe('comment');
  });

  it('returns comment when there is a warning and no blocker', () => {
    expect(computeVerdict([finding({ severity: 'nit' }), finding({ severity: 'warning' })])).toBe(
      'comment',
    );
  });

  it('returns request-changes for a blocker alone', () => {
    expect(computeVerdict([finding({ severity: 'blocker' })])).toBe('request-changes');
  });

  it('returns request-changes for a blocker and a nit, no warning', () => {
    expect(
      computeVerdict([finding({ severity: 'blocker' }), finding({ severity: 'nit' })]),
    ).toBe('request-changes');
  });

  it('returns request-changes for a blocker and a warning, no nit', () => {
    expect(
      computeVerdict([finding({ severity: 'blocker' }), finding({ severity: 'warning' })]),
    ).toBe('request-changes');
  });

  it('returns request-changes when there is a blocker alongside every other severity', () => {
    expect(
      computeVerdict([
        finding({ severity: 'nit' }),
        finding({ severity: 'warning' }),
        finding({ severity: 'blocker' }),
      ]),
    ).toBe('request-changes');
  });
});
