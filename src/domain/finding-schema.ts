import { categories, severities } from './finding';

export const findingsResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['path', 'line', 'category', 'severity', 'explanation'],
        properties: {
          path: { type: 'string' },
          line: { type: 'integer' },
          category: { type: 'string', enum: categories },
          severity: { type: 'string', enum: severities },
          explanation: { type: 'string' },
          suggestion: { type: 'string' },
        },
      },
    },
  },
} as const;
