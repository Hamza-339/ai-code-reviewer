import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { type Express, type Request } from 'express';
import { AppModule } from './app.module';

// Disables Nest's own body parser (bodyParser: false) so we can install our own
// express.json with a `verify` hook that captures the exact raw bytes GitHub
// signed — the HMAC check in webhook-signature.ts needs those bytes verbatim,
// not a reserialized copy of the parsed JSON.
export async function createApp(server: Express): Promise<void> {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    bodyParser: false,
  });

  app.use(
    express.json({
      verify: (req: Request, _res, buf: Buffer) => {
        (req as Request & { rawBody?: string }).rawBody = buf.toString('utf8');
      },
    }),
  );

  await app.init();
}
