import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';

const HOST = '127.0.0.1';

createApp().listen(env.PORT, HOST, () => {
  logger.info({ host: HOST, port: env.PORT }, 'Book Worm API listening');
});
