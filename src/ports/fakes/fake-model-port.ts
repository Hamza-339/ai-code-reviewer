import type { ModelPort } from '../model-port';
import type { Finding } from '../../domain/finding';

export class FakeModelPort implements ModelPort {
  readonly requests: string[] = [];

  constructor(
    private readonly responses: Finding[][] = [],
    private readonly tokenCounter: (text: string) => number = (text) => text.length,
  ) {}

  review(renderedDiff: string): Promise<Finding[]> {
    const response = this.responses[this.requests.length] ?? [];
    this.requests.push(renderedDiff);
    return Promise.resolve(response);
  }

  countTokens(text: string): Promise<number> {
    return Promise.resolve(this.tokenCounter(text));
  }
}
