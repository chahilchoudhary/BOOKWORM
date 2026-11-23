import { z } from 'zod';

const positiveInt = z.coerce.number().int().positive();
const nonNegativeInt = z.coerce.number().int().nonnegative();
const postgresUrl = z.string().regex(/^postgres(ql)?:\/\/\S+$/, 'must be a postgres:// URL');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: positiveInt.max(65535),
  DATABASE_URL: postgresUrl,
  TEST_DATABASE_URL: postgresUrl,
  JWT_SECRET: z.string().min(32, 'must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().min(1),
  CORS_ORIGIN: z.url(),
  TAX_RATE: z.coerce.number().min(0).max(1),
  DELIVERY_DAYS: nonNegativeInt,
  FREE_DELIVERY_THRESHOLD_PAISE: nonNegativeInt,
  DELIVERY_FEE_PAISE: nonNegativeInt,
  CANCEL_WINDOW_HOURS: positiveInt,
});

export type Env = z.infer<typeof envSchema>;

export class EnvError extends Error {
  constructor(public readonly issues: string[]) {
    super(
      `Invalid or missing environment variables:\n${issues.map((i) => `  - ${i}`).join('\n')}\n` +
        'Copy backend/.env.example to backend/.env and fill in the values.',
    );
    this.name = 'EnvError';
  }
}

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new EnvError(
      result.error.issues.map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`),
    );
  }
  return result.data;
}

function loadEnv(): Env {
  try {
    return parseEnv(process.env);
  } catch (error) {
    if (error instanceof EnvError) {
      process.stderr.write(`${error.message}\n`);
      process.exit(1);
    }
    throw error;
  }
}

export const env: Env = loadEnv();
