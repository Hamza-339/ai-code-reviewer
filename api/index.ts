import type { IncomingMessage, ServerResponse } from 'http';
import express from 'express';
import { createApp } from '../src/bootstrap';

// Vercel keeps this module cached across warm invocations of the same function
// instance, so the Nest app is built once and reused rather than per-request.
let serverPromise: Promise<express.Express> | null = null;

function getServer(): Promise<express.Express> {
  if (!serverPromise) {
    const server = express();
    serverPromise = createApp(server).then(() => server);
  }
  return serverPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const server = await getServer();
  server(req, res);
}
