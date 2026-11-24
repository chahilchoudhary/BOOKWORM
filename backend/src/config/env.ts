export const env = {
  PORT: Number(process.env.PORT ?? 4000),
  JWT_SECRET: process.env.JWT_SECRET ?? 'dev-only-secret-change-me',
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://bookworm:bookworm@127.0.0.1:5432/bookworm',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
};

// Business rules (rupees, whole numbers)
export const RULES = {
  TAX_RATE: 0.12,
  FREE_DELIVERY_FROM: 300,
  DELIVERY_FEE: 40,
  DELIVERY_DAYS: 5,
  CANCEL_WINDOW_HOURS: 48,
  MAX_POINTS_SHARE: 0.2,
  MAX_QTY: 10,
};
