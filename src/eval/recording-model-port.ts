import type { ModelPort } from '../ports/model-port';
import type { Finding } from '../domain/finding';

export class RecordingModelPort implements ModelPort {
  readonly findings: Finding[] = [];

  constructor(private readonly delegate: ModelPort) {}

  async review(renderedDiff: string): Promise<Finding[]> {
    const result = await this.delegate.review(renderedDiff);
    this.findings.push(...result);
    return result;
  }

  countTokens(text: string): Promise<number> {
    return this.delegate.countTokens(text);
  }
}
