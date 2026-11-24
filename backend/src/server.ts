import { createApp } from './app.js';
import { env } from './config/env.js';

createApp().listen(env.PORT, '127.0.0.1', () => {
  console.log(`Book Worm API running on http://localhost:${env.PORT}`);
});
