const shutdown = (signal: string) => {
  console.log(`Worker received ${signal}. Shutting down...`);
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

console.log('Worker started');
