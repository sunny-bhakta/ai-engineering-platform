const shutdown = (signal: string) => {
  console.log(`Ingestion service received ${signal}. Shutting down...`);
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

console.log('Ingestion service started');
