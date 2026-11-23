import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      PORT: '4000',
      DATABASE_URL: 'postgres://bookworm:bookworm@localhost:5432/bookworm',
      TEST_DATABASE_URL: 'postgres://bookworm:bookworm@localhost:5433/bookworm_test',
      JWT_SECRET: 'test-only-jwt-secret-with-at-least-32-chars',
      JWT_EXPIRES_IN: '2h',
      CORS_ORIGIN: 'http://localhost:5173',
      TAX_RATE: '0.12',
      DELIVERY_DAYS: '5',
      FREE_DELIVERY_THRESHOLD_PAISE: '30000',
      DELIVERY_FEE_PAISE: '4000',
      CANCEL_WINDOW_HOURS: '48',
    },
  },
});
