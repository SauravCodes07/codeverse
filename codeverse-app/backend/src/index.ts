// ============================================================================
// CodeVerse: "Antigravity" Router - Core Execution Engine
// Language: Node.js + TypeScript
// Framework: Express.js + gRPC
// ============================================================================

import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { Pool } from 'pg';
import Redis from 'ioredis';
import AWS from 'aws-sdk';
import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import axios from 'axios';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface CodeFile {
  name: string;
  path: string;
  content: string;
  language: string;
}

interface ExecutionPayload {
  workspace_id: string;
  user_id: string;
  active_file: CodeFile;
  code_files: CodeFile[];
  test_cases?: TestCase[];
  execution_timeout_seconds?: number;
  memory_limit_mb?: number;
  cpu_limit_cores?: number;
}

interface ExecutionResult {
  execution_id: string;
  status: 'pending' | 'running' | 'completed' | 'timeout' | 'runtime_error' | 'compilation_error' | 'oom_killed';
  exit_code: number | null;
  stdout: string;
  stderr: string;
  compiler_output?: string;
  execution_time_ms: number;
  cpu_time_ms: number;
  memory_used_mb: number;
  peak_memory_mb: number;
  test_results?: TestResult[];
  error?: string;
}

interface TestCase {
  id: string;
  input: string;
  expected_output: string;
  time_limit_ms: number;
  memory_limit_mb: number;
}

interface TestResult {
  test_id: string;
  passed: boolean;
  expected: string;
  actual: string;
  execution_time_ms: number;
  memory_used_mb: number;
  error?: string;
}

interface LanguageConfig {
  language: string;
  extensions: string[];
  compiler?: string;
  runtime: string;
  compile_command: (files: string[]) => string;
  run_command: (executable: string) => string;
  timeout_ms: number;
  memory_limit_mb: number;
  requires_compilation: boolean;
  entry_point_pattern: RegExp;
  build_directory: string;
}

// ============================================================================
// LANGUAGE CONFIGURATION
// ============================================================================

const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
  cpp: {
    language: 'cpp',
    extensions: ['.cpp', '.cc', '.cxx', '.hpp', '.h'],
    compiler: 'g++',
    runtime: 'g++',
    compile_command: (files: string[]) => `g++ -std=c++17 -O2 -Wall ${files.join(' ')} -o ./build/program`,
    run_command: (executable: string) => `${executable}`,
    timeout_ms: 5000,
    memory_limit_mb: 512,
    requires_compilation: true,
    entry_point_pattern: /^[^/]*\.cpp$/i,
    build_directory: './build',
  },
  c: {
    language: 'c',
    extensions: ['.c', '.h'],
    compiler: 'gcc',
    runtime: 'gcc',
    compile_command: (files: string[]) => `gcc -std=c11 -O2 -Wall ${files.join(' ')} -o ./build/program`,
    run_command: (executable: string) => `${executable}`,
    timeout_ms: 5000,
    memory_limit_mb: 256,
    requires_compilation: true,
    entry_point_pattern: /^[^/]*\.c$/i,
    build_directory: './build',
  },
  java: {
    language: 'java',
    extensions: ['.java'],
    compiler: 'javac',
    runtime: 'java',
    compile_command: (files: string[]) => `javac ${files.join(' ')}`,
    run_command: (executable: string) => `java -Xmx512m Main`,
    timeout_ms: 8000,
    memory_limit_mb: 512,
    requires_compilation: true,
    entry_point_pattern: /^Main\.java$/i,
    build_directory: './',
  },
  python: {
    language: 'python',
    extensions: ['.py'],
    compiler: '',
    runtime: 'python3',
    compile_command: () => 'true', // No compilation for Python
    run_command: (executable: string) => `python3 ${executable}`,
    timeout_ms: 5000,
    memory_limit_mb: 256,
    requires_compilation: false,
    entry_point_pattern: /^[^/]*\.py$/i,
    build_directory: './',
  },
  javascript: {
    language: 'javascript',
    extensions: ['.js', '.mjs'],
    compiler: '',
    runtime: 'node',
    compile_command: () => 'true',
    run_command: (executable: string) => `node ${executable}`,
    timeout_ms: 5000,
    memory_limit_mb: 256,
    requires_compilation: false,
    entry_point_pattern: /^[^/]*\.js$/i,
    build_directory: './',
  },
  go: {
    language: 'go',
    extensions: ['.go'],
    compiler: 'go',
    runtime: 'go',
    compile_command: (files: string[]) => `go build -o ./build/program ${files[0]}`,
    run_command: (executable: string) => `${executable}`,
    timeout_ms: 5000,
    memory_limit_mb: 512,
    requires_compilation: true,
    entry_point_pattern: /^[^/]*\.go$/i,
    build_directory: './build',
  },
  rust: {
    language: 'rust',
    extensions: ['.rs'],
    compiler: 'rustc',
    runtime: 'rustc',
    compile_command: (files: string[]) => `rustc -O ${files[0]} -o ./build/program`,
    run_command: (executable: string) => `${executable}`,
    timeout_ms: 8000,
    memory_limit_mb: 512,
    requires_compilation: true,
    entry_point_pattern: /^[^/]*\.rs$/i,
    build_directory: './build',
  },
};

// ============================================================================
// EXECUTION ENGINE SERVICE
// ============================================================================

class AntigravityRouter {
  private app: express.Application;
  private db: Pool;
  private redis: Redis;
  private s3: AWS.S3;
  private executionQueue: Map<string, ExecutionResult>;
  private grpcClient: any;
  private eventEmitter: EventEmitter;

  constructor() {
    this.app = express();
    this.executionQueue = new Map();
    this.eventEmitter = new EventEmitter();

    // Initialize PostgreSQL connection pool
    this.db = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Initialize Redis for caching and pub/sub
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: null,
    });

    // Initialize AWS S3 for file storage
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.initializeGrpcClient();
  }

  // =========================================================================
  // MIDDLEWARE & SETUP
  // =========================================================================

  private setupMiddleware(): void {
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ limit: '50mb', extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      const startTime = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
      });
      next();
    });

    // Authentication middleware
    this.app.use(this.authenticateRequest.bind(this));

    // Error handling
    this.app.use(this.globalErrorHandler.bind(this));
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // Main execution endpoint
    this.app.post('/api/v1/execute', this.handleExecution.bind(this));

    // Get execution status
    this.app.get('/api/v1/execution/:executionId', this.getExecutionStatus.bind(this));

    // Get execution results
    this.app.get('/api/v1/execution/:executionId/results', this.getExecutionResults.bind(this));

    // Get execution queue stats
    this.app.get('/api/v1/queue/stats', this.getQueueStats.bind(this));

    // Webhook from execution sandbox (async result reporting)
    this.app.post('/api/v1/webhook/execution-complete', this.handleExecutionWebhook.bind(this));
  }

  private initializeGrpcClient(): void {
    const PROTO_PATH = path.join(__dirname, './protos/executor.proto');
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });

    const executorProto = grpc.loadPackageDefinition(packageDefinition).executor;
    this.grpcClient = new (executorProto as any).ExecutionService(
      `${process.env.EXECUTOR_HOST || 'executor.codeverse.svc.cluster.local'}:50051`,
      grpc.credentials.createInsecure()
    );
  }
// ============================================================================

const app: Express = express();
const httpServer = createServer(app);
const io = new SocketServer(httpServer, {
  cors: { origin: '*' },
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    (req as any).user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// ============================================================================
// LANGUAGE CONFIGURATION
// ============================================================================

const LANGUAGE_CONFIGS: Record<string, any> = {
  cpp: {
    extensions: ['.cpp', '.cc', '.cxx', '.hpp', '.h'],
    compiler: 'g++',
    compile_command: (files: string[]) => `g++ -std=c++17 -O2 ${files.join(' ')} -o /tmp/program`,
    run_command: '/tmp/program',
    timeout_ms: 5000,
    memory_limit_mb: 512,
  },
  c: {
    extensions: ['.c', '.h'],
    compiler: 'gcc',
    compile_command: (files: string[]) => `gcc -std=c11 -O2 ${files.join(' ')} -o /tmp/program`,
    run_command: '/tmp/program',
    timeout_ms: 5000,
    memory_limit_mb: 256,
  },
  java: {
    extensions: ['.java'],
    compiler: 'javac',
    compile_command: (files: string[]) => `javac ${files.join(' ')}`,
    run_command: 'java -Xmx512m Main',
    timeout_ms: 8000,
    memory_limit_mb: 512,
  },
  python: {
    extensions: ['.py'],
    compiler: 'python3',
    compile_command: () => 'true',
    run_command: (file: string) => `python3 ${file}`,
    timeout_ms: 5000,
    memory_limit_mb: 256,
  },
  javascript: {
    extensions: ['.js', '.mjs'],
    compiler: 'node',
    compile_command: () => 'true',
    run_command: (file: string) => `node ${file}`,
    timeout_ms: 5000,
    memory_limit_mb: 256,
  },
};

// ============================================================================
// EXECUTION ENGINE
// ============================================================================

class ExecutionEngine {
  private executionQueue = new Map<string, ExecutionResult>();

  async execute(payload: ExecutionPayload): Promise<ExecutionResult> {
    const executionId = uuidv4();
    const activeFile = payload.active_file;

    try {
      // Detect language
      const language = this.detectLanguage(activeFile);
      if (!language) {
        throw new Error(`Unsupported language for file: ${activeFile.name}`);
      }

      const config = LANGUAGE_CONFIGS[language];

      // Store in database
      await db.query(
        `INSERT INTO submissions (id, workspace_id, user_id, language, entry_point, status, submitted_at)
         VALUES ($1, $2, $3, $4, $5, 'pending', NOW())`,
        [executionId, payload.workspace_id, payload.user_id, language, activeFile.path]
      );

      // Simulate execution (replace with actual Docker execution)
      const result: ExecutionResult = {
        execution_id: executionId,
        status: 'completed',
        exit_code: 0,
        stdout: `Hello from ${language}!\n`,
        stderr: '',
        execution_time_ms: Math.random() * 1000,
        cpu_time_ms: Math.random() * 800,
        memory_used_mb: Math.floor(Math.random() * 100),
        peak_memory_mb: Math.floor(Math.random() * 150),
      };

      // Save to database
      await db.query(
        `UPDATE submissions SET status = $2, stdout_output = $3, exit_code = $4, execution_time_ms = $5, completed_at = NOW()
         WHERE id = $1`,
        [executionId, result.status, result.stdout, result.exit_code, result.execution_time_ms]
      );

      // Cache result
      await redis.setex(`execution:${executionId}`, 3600, JSON.stringify(result));

      return result;
    } catch (error) {
      logger.error(`Execution failed: ${error}`);
      throw error;
    }
  }

  private detectLanguage(file: CodeFile): string | null {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    for (const [lang, config] of Object.entries(LANGUAGE_CONFIGS)) {
      if ((config as any).extensions.includes(ext)) {
        return lang;
      }
    }

    return null;
  }
}

const executionEngine = new ExecutionEngine();

// ============================================================================
// ROUTES
// ============================================================================

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Execute code
app.post('/api/v1/execute', authenticateToken, async (req: Request, res: Response) => {
  try {
    const payload: ExecutionPayload = req.body;

    // Validation
    if (!payload.workspace_id || !payload.user_id || !payload.active_file) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Execute asynchronously
    res.status(202).json({
      execution_id: 'pending',
      status: 'queued',
      message: 'Execution queued for processing',
    });

    // Process async
    executionEngine.execute(payload).catch((error) => {
      logger.error(`Execution error: ${error}`);
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get execution status
app.get('/api/v1/execution/:executionId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { executionId } = req.params;

    // Check cache first
    const cached = await redis.get(`execution:${executionId}`);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // Check database
    const result = await db.query(
      `SELECT * FROM submissions WHERE id = $1`,
      [executionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List workspaces
app.get('/api/v1/workspaces', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const result = await db.query(
      `SELECT * FROM workspaces WHERE owner_id = $1 OR id IN (
        SELECT workspace_id FROM workspace_collaborators WHERE user_id = $1
      )`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create workspace
app.post('/api/v1/workspaces', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    const userId = (req as any).user.id;
    const workspaceId = uuidv4();

    await db.query(
      `INSERT INTO workspaces (id, owner_id, name, slug, description, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [workspaceId, userId, name, name.toLowerCase().replace(/\s+/g, '-'), description]
    );

    res.status(201).json({ id: workspaceId, name, description });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get files in workspace
app.get('/api/v1/workspaces/:workspaceId/files', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;

    const result = await db.query(
      `SELECT * FROM files WHERE workspace_id = $1 ORDER BY path`,
      [workspaceId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create file
app.post('/api/v1/workspaces/:workspaceId/files', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { name, path: filePath, content, language } = req.body;
    const fileId = uuidv4();

    await db.query(
      `INSERT INTO files (id, workspace_id, name, path, file_type, language, size_bytes, content_hash, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'file', $5, $6, $7, NOW(), NOW())`,
      [fileId, workspaceId, name, filePath, language, content?.length || 0, Buffer.from(content || '').toString('hex')]
    );

    res.status(201).json({ id: fileId, name, path: filePath });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update file
app.put('/api/v1/workspaces/:workspaceId/files/:fileId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { workspaceId, fileId } = req.params;
    const { content } = req.body;

    await db.query(
      `UPDATE files SET size_bytes = $1, updated_at = NOW() WHERE id = $2 AND workspace_id = $3`,
      [content?.length || 0, fileId, workspaceId]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login endpoint (for demo)
app.post('/api/v1/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Check user in database
    const result = await db.query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      // For demo, create user
      const userId = uuidv4();
      await db.query(
        `INSERT INTO users (id, email, full_name, username, auth_provider, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'email', NOW(), NOW())`,
        [userId, email, email, email.split('@')[0]]
      );

      const token = jwt.sign({ id: userId, email }, process.env.JWT_SECRET || 'your-secret-key', {
        expiresIn: '7d',
      });

      return res.json({ token, user: { id: userId, email } });
    }

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: '7d',
    });

    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// WEBSOCKET HANDLERS
// ============================================================================

io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('join-workspace', (workspaceId) => {
    socket.join(`workspace-${workspaceId}`);
    logger.info(`Client ${socket.id} joined workspace ${workspaceId}`);
  });

  socket.on('code-update', (data) => {
    io.to(`workspace-${data.workspaceId}`).emit('code-update', data);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

const PORT = parseInt(process.env.PORT || '3000');

const start = async () => {
  try {
    // Test database connection
    await db.query('SELECT NOW()');
    logger.info('Database connected successfully');

    // Test Redis connection
    await redis.ping();
    logger.info('Redis connected successfully');

    httpServer.listen(PORT, () => {
      logger.info(`CodeVerse Backend running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();

export default app;
