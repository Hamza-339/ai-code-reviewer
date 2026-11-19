import { createHmac } from 'crypto';
import express from 'express';
import request from 'supertest';
import { waitUntil } from '@vercel/functions';
import { createApp } from './bootstrap';

jest.mock('@vercel/functions', () => ({ waitUntil: jest.fn<void, [Promise<unknown>]>() }));

function waitUntilMock(): jest.Mock<void, [Promise<unknown>]> {
  return waitUntil as jest.Mock<void, [Promise<unknown>]>;
}

const SECRET = 'fixture-webhook-secret';

function signatureFor(payload: string): string {
  return `sha256=${createHmac('sha256', SECRET).update(payload).digest('hex')}`;
}

function pullRequestBody(action: string) {
  return JSON.stringify({
    action,
    pull_request: { number: 42 },
    repository: { name: 'widgets', owner: { login: 'acme' } },
  });
}

describe('bootstrap (real AppModule wired into an Express server)', () => {
  const originalSecret = process.env.GITHUB_WEBHOOK_SECRET;

  beforeAll(() => {
    process.env.GITHUB_WEBHOOK_SECRET = SECRET;
  });

  afterAll(() => {
    process.env.GITHUB_WEBHOOK_SECRET = originalSecret;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function buildServer(): Promise<express.Express> {
    const server = express();
    await createApp(server);
    return server;
  }

  it('GET /health reports ok', async () => {
    const server = await buildServer();

    const response = await request(server).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('acks a correctly signed, reviewable webhook with 2xx and schedules background work via waitUntil', async () => {
    const server = await buildServer();
    const body = pullRequestBody('opened');

    const response = await request(server)
      .post('/webhook/github')
      .set('Content-Type', 'application/json')
      .set('x-hub-signature-256', signatureFor(body))
      .set('x-github-event', 'pull_request')
      .send(body);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ received: true });
    expect(waitUntil).toHaveBeenCalledTimes(1);
  });

  it('acks with 2xx even though GITHUB_APP_ID etc. are not configured in this test environment', async () => {
    // Exercises the ack-then-background invariant for real: the production
    // ModelPort/GitHubPort factories are only invoked inside the awaited
    // waitUntil promise, so missing credentials must never surface as a
    // synchronous failure of the webhook response itself.
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const server = await buildServer();
    const body = pullRequestBody('opened');

    const response = await request(server)
      .post('/webhook/github')
      .set('Content-Type', 'application/json')
      .set('x-hub-signature-256', signatureFor(body))
      .set('x-github-event', 'pull_request')
      .send(body);

    expect(response.status).toBe(200);
    await expect(waitUntilMock().mock.calls[0]![0]).resolves.toBeUndefined();

    consoleError.mockRestore();
  });

  it('rejects a webhook with an invalid signature and schedules no background work', async () => {
    const server = await buildServer();
    const body = pullRequestBody('opened');

    const response = await request(server)
      .post('/webhook/github')
      .set('Content-Type', 'application/json')
      .set('x-hub-signature-256', 'sha256=deadbeef')
      .set('x-github-event', 'pull_request')
      .send(body);

    expect(response.status).toBe(401);
    expect(waitUntil).not.toHaveBeenCalled();
  });
});
