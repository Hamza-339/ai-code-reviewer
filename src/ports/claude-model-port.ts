import AnthropicClient from '@anthropic-ai/sdk';
import type Anthropic from '@anthropic-ai/sdk';
import type { ModelPort } from './model-port';
import type { Finding } from '../domain/finding';
import { findingsResponseSchema } from '../domain/finding-schema';

export type { Anthropic };

export const DEFAULT_MODEL = 'claude-haiku-4-5';
export const SONNET_ESCALATION_MODEL = 'claude-sonnet-5';

const MAX_OUTPUT_TOKENS = 8192;

const SYSTEM_PROMPT =
  'You are an automated code reviewer. Given a rendered pull request diff, report findings only on changed lines in the new file. Each finding has a path, a new-file line number, a category, a severity, an explanation, and an optional suggestion. Do not report a merge verdict.';

export interface ClaudeMessagesClient {
  messages: {
    create(params: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message>;
    countTokens(params: Anthropic.MessageCountTokensParams): Promise<Anthropic.MessageTokensCount>;
  };
}

export interface ClaudeModelPortConfig {
  model?: string;
}

const OUTPUT_CONFIG: Anthropic.OutputConfig = {
  format: { type: 'json_schema', schema: findingsResponseSchema },
};

export class ClaudeModelPort implements ModelPort {
  private readonly model: string;

  constructor(
    private readonly client: ClaudeMessagesClient,
    config: ClaudeModelPortConfig = {},
  ) {
    this.model = config.model ?? DEFAULT_MODEL;
  }

  async review(renderedDiff: string): Promise<Finding[]> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: SYSTEM_PROMPT,
      output_config: OUTPUT_CONFIG,
      messages: [{ role: 'user', content: renderedDiff }],
    });

    return parseFindings(response);
  }

  async countTokens(text: string): Promise<number> {
    // Mirror review()'s system prompt and output schema so the count reflects
    // the same input tokens the budget stage is trying to stay under.
    const result = await this.client.messages.countTokens({
      model: this.model,
      system: SYSTEM_PROMPT,
      output_config: OUTPUT_CONFIG,
      messages: [{ role: 'user', content: text }],
    });
    return result.input_tokens;
  }
}

export function createClaudeModelPort(config: ClaudeModelPortConfig = {}): ClaudeModelPort {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }
  return new ClaudeModelPort(new AnthropicClient({ apiKey }), config);
}

function parseFindings(response: Anthropic.Message): Finding[] {
  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text',
  );
  if (!textBlock) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(textBlock.text);
  } catch (error) {
    throw new Error(
      `Claude response was not valid JSON (stop_reason: ${response.stop_reason ?? 'unknown'})`,
      { cause: error },
    );
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !Array.isArray((parsed as { findings?: unknown }).findings)
  ) {
    throw new Error(`Claude response did not match the expected findings[] shape`);
  }

  return (parsed as { findings: Finding[] }).findings;
}
