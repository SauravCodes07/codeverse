import { Pool } from 'pg';
import config from './env';

const pool = new Pool({
  connectionString: config.dbUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});


pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
export const getClient = () => pool.connect();

export default pool;
