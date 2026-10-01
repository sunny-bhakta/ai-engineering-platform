import { createApp } from './app.js';

const app = createApp();

const host = process.env.API_HOST ?? '0.0.0.0';
const port = Number(process.env.API_PORT ?? 3000);

const start = async () => {
  try {
    await app.listen({
      host,
      port,
    });

    app.log.info(`API listening on http://${host}:${port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

const shutdown = async (signal: string) => {
  app.log.info(`Received ${signal}. Shutting down...`);

  await app.close();

  process.exit(0);
};

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

void start();
