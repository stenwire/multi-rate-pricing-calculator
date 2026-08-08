import { app } from './app';
import { connectDatabase } from './config/db';
import { env } from './config/env';

async function start(): Promise<void> {
  await connectDatabase();

  app.listen(Number(env.PORT), () => {
    console.log(`API listening on http://localhost:${env.PORT}`);
  });
}

start().catch((error: unknown) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
