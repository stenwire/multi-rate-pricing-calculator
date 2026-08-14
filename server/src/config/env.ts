import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const envSchema = z.object({
  PORT: z.string().default('5000'),
  MONGODB_URI: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  // Not a spec §4 variable. Deploying the client to a different host than the API makes the
  // allowed origin environment-specific, so it defaults to the Vite dev server and is
  // overridden in production. Comma-separated because Firebase Hosting serves one site at
  // both .web.app and .firebaseapp.com, which are distinct origins to the browser.
  CLIENT_ORIGIN: z
    .string()
    .default('http://localhost:5173')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    )
    .pipe(z.array(z.string().url()).nonempty()),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const problems = parsed.error.errors
    .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  console.error(`Invalid environment configuration:\n${problems}`);
  console.error(
    'Copy .env.example to .env at the project root and fill in the values.',
  );
  process.exit(1);
}

export const env = parsed.data;
