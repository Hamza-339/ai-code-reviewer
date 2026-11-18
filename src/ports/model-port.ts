import type { Finding } from '../domain/finding';

export interface ModelPort {
  review(renderedDiff: string): Promise<Finding[]>;
  countTokens(text: string): number;
}
