import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import config from './config/env';
import pool from './config/db';
import redis from './config/redis';

const PORT = config.port;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  🚀 CodeVerse Backend is running!
  📡 Port: ${PORT}
  🔗 URL: http://0.0.0.0:${PORT}
  🛠️ Environment: ${config.env}
  `);
});

// --- Graceful Shutdown & Error Handling ---

const shutdown = async (signal: string) => {
  console.log(`\n[${signal}] Received. Starting graceful shutdown...`);
  
  server.close(async () => {
    console.log('HTTP server closed.');
    
    try {
      await pool.end();
      console.log('PostgreSQL pool closed.');
      
      await redis.quit();
      console.log('Redis connection closed.');
      
      process.exit(0);
    } catch (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message, err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(reason);
  process.exit(1);
});

