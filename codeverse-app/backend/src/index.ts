/**
 * CodeVerse backend entrypoint.
 * Server implementation lives in ./router.ts (AntigravityRouter).
 */
import 'dotenv/config';

console.log('[codeverse-boot]', JSON.stringify({
  PORT: process.env.PORT ?? '(unset, using 3000 in code)',
  cwd: process.cwd(),
  BIND_HOST: process.env.BIND_HOST ?? '0.0.0.0',
}));

import './router';
