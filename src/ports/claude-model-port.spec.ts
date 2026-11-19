import {
  ClaudeModelPort,
  createClaudeModelPort,
  DEFAULT_MODEL,
  SONNET_ESCALATION_MODEL,
} from './claude-model-port';
import type { ClaudeMessagesClient } from './claude-model-port';
import type { Anthropic } from './claude-model-port';
import { findingsResponseSchema } from '../domain/finding-schema';

type CreateMock = jest.Mock<
  Promise<Anthropic.Message>,
  [Anthropic.MessageCreateParamsNonStreaming]
>;
type CountTokensMock = jest.Mock<
  Promise<Anthropic.MessageTokensCount>,
  [Anthropic.MessageCountTokensParams]
>;

function fakeClient(
  overrides: Partial<{
    create: CreateMock;
    countTokens: CountTokensMock;
  }> = {},
): ClaudeMessagesClient {
  return {
    messages: {
      create: overrides.create ?? jest.fn(),
      countTokens: overrides.countTokens ?? jest.fn(),
    },
  };
}

function createMock(response: Anthropic.Message): CreateMock {
  return jest.fn<Promise<Anthropic.Message>, [Anthropic.MessageCreateParamsNonStreaming]>(() =>
    Promise.resolve(response),
  );
}

function countTokensMock(inputTokens: number): CountTokensMock {
  return jest.fn<Promise<Anthropic.MessageTokensCount>, [Anthropic.MessageCountTokensParams]>(
    () => Promise.resolve({ input_tokens: inputTokens }),
  );
}

function firstCallParams(mock: CreateMock): Anthropic.MessageCreateParamsNonStreaming {
  const params = mock.mock.calls[0]?.[0];
  if (!params) {
    throw new Error('expected create to have been called');
  }
  return params;
}

function textResponse(json: unknown): Anthropic.Message {
  return {
    content: [{ type: 'text', text: JSON.stringify(json) }],
  } as Anthropic.Message;
}

describe('ClaudeModelPort', () => {
  describe('review', () => {
    it('returns the findings parsed from the model response', async () => {
      const create = createMock(
        textResponse({
          findings: [
            {
              path: 'src/a.ts',
              line: 2,
              category: 'bug',
              severity: 'warning',
              explanation: 'looks off',
            },
          ],
        }),
      );
      const port = new ClaudeModelPort(fakeClient({ create }));

      const findings = await port.review('rendered diff');

      expect(findings).toEqual([
        {
          path: 'src/a.ts',
          line: 2,
          category: 'bug',
          severity: 'warning',
          explanation: 'looks off',
        },
      ]);
    });

    it('requests the default Haiku model, the flat findings schema, and the rendered diff', async () => {
      const create = createMock(textResponse({ findings: [] }));
      const port = new ClaudeModelPort(fakeClient({ create }));

      await port.review('rendered diff');

      expect(create).toHaveBeenCalledTimes(1);
      const params = firstCallParams(create);
      expect(params.model).toBe(DEFAULT_MODEL);
      expect(params.messages).toEqual([{ role: 'user', content: 'rendered diff' }]);
      expect(params.output_config?.format).toEqual({
        type: 'json_schema',
        schema: findingsResponseSchema,
      });
    });

    it('requests the configured escalation model instead of the default', async () => {
      const create = createMock(textResponse({ findings: [] }));
      const port = new ClaudeModelPort(fakeClient({ create }), {
        model: SONNET_ESCALATION_MODEL,
      });

      await port.review('rendered diff');

      expect(firstCallParams(create).model).toBe(SONNET_ESCALATION_MODEL);
    });

    it('returns an empty array when the response has no text block', async () => {
      const create = createMock({ content: [] } as unknown as Anthropic.Message);
      const port = new ClaudeModelPort(fakeClient({ create }));

      const findings = await port.review('rendered diff');

      expect(findings).toEqual([]);
    });
  });

  describe('countTokens', () => {
    it('resolves to the input_tokens count from the model, using the configured model id', async () => {
      const countTokens = countTokensMock(42);
      const port = new ClaudeModelPort(fakeClient({ countTokens }), {
        model: SONNET_ESCALATION_MODEL,
      });

      const count = await port.countTokens('some diff text');

      expect(count).toBe(42);
      expect(countTokens).toHaveBeenCalledWith({
        model: SONNET_ESCALATION_MODEL,
        messages: [{ role: 'user', content: 'some diff text' }],
      });
    });
  });
});

describe('createClaudeModelPort', () => {
  const originalApiKey = process.env.ANTHROPIC_API_KEY;

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.ANTHROPIC_API_KEY;
    } else {
      process.env.ANTHROPIC_API_KEY = originalApiKey;
    }
  });

  it('throws without reading or printing any value when ANTHROPIC_API_KEY is unset', () => {
    delete process.env.ANTHROPIC_API_KEY;

    expect(() => createClaudeModelPort()).toThrow(/ANTHROPIC_API_KEY/);
  });

  it('constructs a ClaudeModelPort when ANTHROPIC_API_KEY is set', () => {
    process.env.ANTHROPIC_API_KEY = 'test-placeholder-key';

    expect(createClaudeModelPort()).toBeInstanceOf(ClaudeModelPort);
  });
});
