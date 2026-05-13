import Redis from 'ioredis';
import config from './env';

const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
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
