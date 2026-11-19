import express from 'express';
import { createApp } from './bootstrap';

async function bootstrap(): Promise<void> {
  const server = express();
  await createApp(server);
  const port = Number(process.env.PORT ?? 3000);
  server.listen(port, () => {
    console.log(`Listening on port ${port}`);
  });
}

void bootstrap();
