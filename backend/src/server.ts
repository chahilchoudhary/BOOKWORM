import { createApp, prepareDatabase } from './app.js';
import { env } from './config/env.js';

try {
  await prepareDatabase();
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}

createApp().listen(env.PORT, '127.0.0.1', () => {
  console.log(`Book Worm API running on http://localhost:${env.PORT}`);
});
