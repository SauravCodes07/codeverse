import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  lazyConnect: true,
  maxRetriesPerRequest: 2,
  retryStrategy: (times) => {
    if (times > 3) return null; // Stop retrying after 3 attempts
    return Math.min(times * 100, 3000);
  },
});

redis.on('error', (err) => {
  console.warn('[Redis Error]', err.message);
});

redis.on('connect', () => {
  console.log('[Redis] Connected successfully');
});

export default redis;
