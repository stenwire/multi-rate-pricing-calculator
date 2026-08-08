import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const envSchema = z.object({
  PORT: z.string().default('5000'),
  MONGODB_URI: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
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
