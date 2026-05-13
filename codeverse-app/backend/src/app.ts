import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import passport from './config/passport';
import authRoutes from './routes/auth.routes';
import config from './config/env';

const app = express();

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // For development and OAuth redirects
}));

app.use(cors({
  origin: config.frontendUrl,
  credentials: true
}));

app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session & Passport
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.env === 'production',
    sameSite: config.env === 'production' ? 'none' : 'lax', // Important for cross-domain OAuth
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },
  proxy: config.env === 'production', // Trust Railway's proxy
}));

app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/v1/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const statusCode = err.status || 500;
  const message = config.env === 'production' ? 'Internal server error' : err.message;
  
  console.error(`[Error] ${req.method} ${req.path}`, {
    message: err.message,
    stack: config.env === 'development' ? err.stack : undefined,
  });

  res.status(statusCode).json({ 
    error: message,
    ...(config.env === 'development' && { stack: err.stack })
  });
});

export default app;

