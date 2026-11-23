import { describe, expect, it } from 'vitest';
import { EnvError, parseEnv } from '../../src/config/env.js';

const validEnv = {
  NODE_ENV: 'development',
  PORT: '4000',
  DATABASE_URL: 'postgres://u:p@localhost:5432/db',
  TEST_DATABASE_URL: 'postgres://u:p@localhost:5433/db_test',
  JWT_SECRET: 'a-secret-that-is-definitely-32-chars-long',
  JWT_EXPIRES_IN: '2h',
  CORS_ORIGIN: 'http://localhost:5173',
  TAX_RATE: '0.12',
  DELIVERY_DAYS: '5',
  FREE_DELIVERY_THRESHOLD_PAISE: '30000',
  DELIVERY_FEE_PAISE: '4000',
  CANCEL_WINDOW_HOURS: '48',
};

describe('parseEnv', () => {
  it('parses and coerces a valid environment', () => {
    const env = parseEnv(validEnv);

    expect(env.PORT).toBe(4000);
    expect(env.TAX_RATE).toBe(0.12);
  });

  it('throws a clear error naming every missing variable', () => {
    expect(() => parseEnv({})).toThrow(EnvError);
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
    expect(() => parseEnv({})).toThrow(/JWT_SECRET/);
  });

  it('rejects a JWT secret shorter than 32 characters', () => {
    expect(() => parseEnv({ ...validEnv, JWT_SECRET: 'too-short' })).toThrow(/at least 32/);
  });
});
