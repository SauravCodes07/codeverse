import joi from 'joi';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = joi.object({
  NODE_ENV: joi.string().valid('development', 'production', 'test').default('development'),
  PORT: joi.number().default(8080),
  DATABASE_URL: joi.string().required().description('PostgreSQL connection string'),
  JWT_SECRET: joi.string().required().description('JWT Secret Key'),
  FRONTEND_URL: joi.string().uri().default('http://localhost:5173'),
  REDIS_HOST: joi.string().default('127.0.0.1'),
  REDIS_PORT: joi.number().default(6379),
  REDIS_PASSWORD: joi.string().allow('').optional(),
  GOOGLE_CLIENT_ID: joi.string().required(),
  GOOGLE_CLIENT_SECRET: joi.string().required(),
  GITHUB_CLIENT_ID: joi.string().required(),
  GITHUB_CLIENT_SECRET: joi.string().required(),
  SESSION_SECRET: joi.string().default('codeverse-session-secret-99'),
}).unknown().required();

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  console.error(`❌ Environment validation error: ${error.message}`);
  // In production, we want to fail fast if config is missing
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

export const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  dbUrl: envVars.DATABASE_URL,
  jwtSecret: envVars.JWT_SECRET,
  frontendUrl: envVars.FRONTEND_URL,
  redis: {
    host: envVars.REDIS_HOST,
    port: envVars.REDIS_PORT,
    password: envVars.REDIS_PASSWORD,
  },
  oauth: {
    google: {
      id: envVars.GOOGLE_CLIENT_ID,
      secret: envVars.GOOGLE_CLIENT_SECRET,
    },
    github: {
      id: envVars.GITHUB_CLIENT_ID,
      secret: envVars.GITHUB_CLIENT_SECRET,
    },
  },
  sessionSecret: envVars.SESSION_SECRET,
};

export default config;
