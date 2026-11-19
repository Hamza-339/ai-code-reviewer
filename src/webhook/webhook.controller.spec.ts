import { createHmac } from 'crypto';
import { HttpException } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { FakeReviewTrigger } from '../ports/fakes/fake-review-trigger';

const SECRET = 'fixture-webhook-secret';

function signatureFor(payload: string, secret: string = SECRET): string {
  return `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;
}

function pullRequestBody(action: string) {
  return {
    action,
    pull_request: { number: 42 },
    repository: { name: 'widgets', owner: { login: 'acme' } },
  };
}

describe('WebhookController', () => {
  it('accepts a correctly signed opened pull_request event and triggers the core once', () => {
    const trigger = new FakeReviewTrigger();
    const controller = new WebhookController(trigger, SECRET);
    const rawBody = JSON.stringify(pullRequestBody('opened'));

    const result = controller.handle(
      { rawBody, body: JSON.parse(rawBody) },
      signatureFor(rawBody),
      'pull_request',
    );

    expect(result).toEqual({ received: true });
    expect(trigger.targets).toEqual([{ owner: 'acme', repo: 'widgets', pullNumber: 42 }]);
  });

  it('rejects a payload with a missing signature and triggers the core zero times', () => {
    const trigger = new FakeReviewTrigger();
    const controller = new WebhookController(trigger, SECRET);
    const rawBody = JSON.stringify(pullRequestBody('opened'));

    expect(() =>
      controller.handle({ rawBody, body: JSON.parse(rawBody) }, undefined, 'pull_request'),
    ).toThrow(HttpException);
    expect(trigger.targets).toEqual([]);
  });

  it('rejects a payload with a tampered signature and triggers the core zero times', () => {
    const trigger = new FakeReviewTrigger();
    const controller = new WebhookController(trigger, SECRET);
    const rawBody = JSON.stringify(pullRequestBody('opened'));
    const tamperedSignature = signatureFor(JSON.stringify(pullRequestBody('closed')));

    expect(() =>
      controller.handle({ rawBody, body: JSON.parse(rawBody) }, tamperedSignature, 'pull_request'),
    ).toThrow(HttpException);
    expect(trigger.targets).toEqual([]);
  });

  it('accepts a correctly signed non-reviewable event and triggers the core zero times', () => {
    const trigger = new FakeReviewTrigger();
    const controller = new WebhookController(trigger, SECRET);
    const rawBody = JSON.stringify(pullRequestBody('closed'));

    const result = controller.handle(
      { rawBody, body: JSON.parse(rawBody) },
      signatureFor(rawBody),
      'pull_request',
    );

    expect(result).toEqual({ received: true });
    expect(trigger.targets).toEqual([]);
  });
});
