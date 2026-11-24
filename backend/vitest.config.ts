import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://bookworm:bookworm@127.0.0.1:5432/bookworm_test',
      JWT_SECRET: 'test-secret',
    },
    fileParallelism: false,
  },
});
