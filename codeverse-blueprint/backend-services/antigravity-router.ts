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

  // =========================================================================
  // CORE EXECUTION LOGIC
  // =========================================================================

  /**
   * Main execution handler - routes code to appropriate sandbox
   */
  private async handleExecution(req: Request, res: Response): Promise<void> {
    const executionId = uuidv4();
    const payload: ExecutionPayload = req.body;

    try {
      // Validate payload
      this.validateExecutionPayload(payload);

      // Detect language from active file
      const language = this.detectLanguage(payload.active_file);
      if (!language) {
        res.status(400).json({
          error: 'Unsupported language',
          supported: Object.keys(LANGUAGE_CONFIGS),
        });
        return;
      }

      // Get language configuration
      const langConfig = LANGUAGE_CONFIGS[language];

      // Start execution (async)
      res.status(202).json({
        execution_id: executionId,
        status: 'queued',
        message: 'Execution queued for processing',
      });

      // Process execution asynchronously
      this.executeAsync(executionId, payload, language, langConfig);
    } catch (error) {
      console.error(`[Execution ${executionId}] Error:`, error);
      res.status(400).json({
        error: 'Invalid execution payload',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Execute code asynchronously
   */
  private async executeAsync(
    executionId: string,
    payload: ExecutionPayload,
    language: string,
    langConfig: LanguageConfig
  ): Promise<void> {
    const result: ExecutionResult = {
      execution_id: executionId,
      status: 'pending',
      exit_code: null,
      stdout: '',
      stderr: '',
      execution_time_ms: 0,
      cpu_time_ms: 0,
      memory_used_mb: 0,
      peak_memory_mb: 0,
    };

    try {
      // Step 1: Store execution metadata in database
      await this.storeExecutionMetadata(executionId, payload, language);

      // Step 2: Update status to running
      result.status = 'running';
      await this.updateExecutionInCache(executionId, result);

      // Step 3: Prepare execution context
      const executionContext = await this.prepareExecutionContext(
        executionId,
        payload,
        language,
        langConfig
      );

      // Step 4: Route to appropriate sandbox via gRPC
      const sandboxResult = await this.invokeExecutor(
        executionId,
        executionContext,
        langConfig,
        payload
      );

      // Step 5: Process results
      result.status = sandboxResult.status;
      result.exit_code = sandboxResult.exit_code;
      result.stdout = sandboxResult.stdout;
      result.stderr = sandboxResult.stderr;
      result.compiler_output = sandboxResult.compiler_output;
      result.execution_time_ms = sandboxResult.execution_time_ms;
      result.cpu_time_ms = sandboxResult.cpu_time_ms;
      result.memory_used_mb = sandboxResult.memory_used_mb;
      result.peak_memory_mb = sandboxResult.peak_memory_mb;

      // Step 6: Run test cases if provided
      if (payload.test_cases && payload.test_cases.length > 0) {
        result.test_results = await this.runTestCases(
          executionId,
          executionContext,
          payload.test_cases,
          langConfig
        );
      }

      // Step 7: Generate AI feedback (async)
      this.generateAIFeedback(executionId, payload, result);

      // Step 8: Save results to database
      await this.saveExecutionResults(executionId, result);

      // Step 9: Update cache and emit completion event
      await this.updateExecutionInCache(executionId, result);
      this.eventEmitter.emit(`execution:${executionId}:complete`, result);

      // Step 10: Send WebSocket update to client (if connected)
      await this.notifyClient(executionId, result);
    } catch (error) {
      result.status = 'runtime_error';
      result.error = error instanceof Error ? error.message : 'Unknown error';

      await this.updateExecutionInCache(executionId, result);
      console.error(`[Execution ${executionId}] Failed:`, error);
    }
  }

  /**
   * Prepare execution context (files, directories, etc.)
   */
  private async prepareExecutionContext(
    executionId: string,
    payload: ExecutionPayload,
    language: string,
    langConfig: LanguageConfig
  ): Promise<{
    execution_id: string;
    workspace_id: string;
    language: string;
    files: Map<string, string>;
    entry_point: string;
    build_command: string;
    run_command: string;
    sandbox_image: string;
  }> {
    // Prepare files map
    const files = new Map<string, string>();

    // Add all code files
    payload.code_files.forEach((file) => {
      files.set(file.path, file.content);
    });

    // Determine entry point
    const entryPoint = this.determineEntryPoint(payload, langConfig);

    // Generate build and run commands
    const fileArray = Array.from(files.keys());
    const buildCommand = langConfig.compile_command(fileArray);
    const runCommand = langConfig.run_command(`./build/program`);

    // Select appropriate sandbox image
    const sandboxImage = this.selectSandboxImage(language);

    // Upload files to S3 for persistence
    const s3Prefix = `executions/${executionId}`;
    for (const [filePath, content] of files.entries()) {
      const s3Key = `${s3Prefix}/src/${filePath}`;
      await this.uploadToS3(s3Key, content);
    }

    return {
      execution_id: executionId,
      workspace_id: payload.workspace_id,
      language,
      files,
      entry_point: entryPoint,
      build_command: buildCommand,
      run_command: runCommand,
      sandbox_image: sandboxImage,
    };
  }

  /**
   * Invoke executor service via gRPC
   */
  private async invokeExecutor(
    executionId: string,
    executionContext: any,
    langConfig: LanguageConfig,
    payload: ExecutionPayload
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const request = {
        execution_id: executionId,
        workspace_id: payload.workspace_id,
        language: executionContext.language,
        files: Array.from(executionContext.files.entries()).map(([path, content]) => ({
          path,
          content,
        })),
        entry_point: executionContext.entry_point,
        build_command: executionContext.build_command,
        run_command: executionContext.run_command,
        sandbox_image: executionContext.sandbox_image,
        timeout_seconds: payload.execution_timeout_seconds || langConfig.timeout_ms / 1000,
        memory_limit_mb: payload.memory_limit_mb || langConfig.memory_limit_mb,
        cpu_limit_cores: payload.cpu_limit_cores || 0.5,
        stdin: '', // Will be filled in for interactive programs
      };

      // Call gRPC executor service
      this.grpcClient.execute(request, (err: any, response: any) => {
        if (err) {
          console.error(`[Execution ${executionId}] gRPC Error:`, err);
          reject(err);
        } else {
          resolve({
            status: response.status,
            exit_code: response.exit_code,
            stdout: response.stdout,
            stderr: response.stderr,
            compiler_output: response.compiler_output,
            execution_time_ms: response.execution_time_ms,
            cpu_time_ms: response.cpu_time_ms,
            memory_used_mb: response.memory_used_mb,
            peak_memory_mb: response.peak_memory_mb,
          });
        }
      });

      // Set timeout
      setTimeout(() => {
        reject(new Error('Execution timeout'));
      }, (payload.execution_timeout_seconds || langConfig.timeout_ms / 1000) * 1000 + 5000);
    });
  }

  /**
   * Run test cases
   */
  private async runTestCases(
    executionId: string,
    executionContext: any,
    testCases: TestCase[],
    langConfig: LanguageConfig
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (const testCase of testCases) {
      try {
        const result = await this.runSingleTestCase(
          executionId,
          executionContext,
          testCase,
          langConfig
        );
        results.push(result);
      } catch (error) {
        results.push({
          test_id: testCase.id,
          passed: false,
          expected: testCase.expected_output,
          actual: '',
          execution_time_ms: 0,
          memory_used_mb: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Run a single test case
   */
  private async runSingleTestCase(
    executionId: string,
    executionContext: any,
    testCase: TestCase,
    langConfig: LanguageConfig
  ): Promise<TestResult> {
    return new Promise((resolve, reject) => {
      const request = {
        execution_id: `${executionId}-test-${testCase.id}`,
        language: executionContext.language,
        files: Array.from(executionContext.files.entries()).map(([path, content]) => ({
          path,
          content,
        })),
        entry_point: executionContext.entry_point,
        build_command: executionContext.build_command,
        run_command: executionContext.run_command,
        sandbox_image: executionContext.sandbox_image,
        stdin: testCase.input,
        timeout_seconds: testCase.time_limit_ms / 1000,
        memory_limit_mb: testCase.memory_limit_mb,
      };

      this.grpcClient.execute(request, (err: any, response: any) => {
        if (err) {
          reject(err);
        } else {
          const passed = response.stdout.trim() === testCase.expected_output.trim();
          resolve({
            test_id: testCase.id,
            passed,
            expected: testCase.expected_output,
            actual: response.stdout,
            execution_time_ms: response.execution_time_ms,
            memory_used_mb: response.memory_used_mb,
          });
        }
      });

      setTimeout(() => {
        reject(new Error('Test case timeout'));
      }, testCase.time_limit_ms + 5000);
    });
  }

  // =========================================================================
  // HELPER METHODS
  // =========================================================================

  /**
   * Detect programming language from file extension
   */
  private detectLanguage(file: CodeFile): string | null {
    const ext = path.extname(file.name).toLowerCase();

    for (const [lang, config] of Object.entries(LANGUAGE_CONFIGS)) {
      if (config.extensions.includes(ext)) {
        return lang;
      }
    }

    return null;
  }

  /**
   * Determine entry point file
   */
  private determineEntryPoint(payload: ExecutionPayload, langConfig: LanguageConfig): string {
    // Check if active file matches entry point pattern
    if (langConfig.entry_point_pattern.test(payload.active_file.name)) {
      return payload.active_file.path;
    }

    // Search in code files
    for (const file of payload.code_files) {
      if (langConfig.entry_point_pattern.test(file.name)) {
        return file.path;
      }
    }

    // Default to active file
    return payload.active_file.path;
  }

  /**
   * Select sandbox image based on language
   */
  private selectSandboxImage(language: string): string {
    const imageMap: Record<string, string> = {
      cpp: 'codeverse/sandbox:cpp-latest',
      c: 'codeverse/sandbox:c-latest',
      java: 'codeverse/sandbox:java-latest',
      python: 'codeverse/sandbox:python-latest',
      javascript: 'codeverse/sandbox:node-latest',
      go: 'codeverse/sandbox:go-latest',
      rust: 'codeverse/sandbox:rust-latest',
    };

    return imageMap[language] || 'codeverse/sandbox:latest';
  }

  /**
   * Upload file to S3
   */
  private async uploadToS3(key: string, content: string): Promise<void> {
    await this.s3
      .putObject({
        Bucket: process.env.S3_BUCKET || 'codeverse-executions',
        Key: key,
        Body: content,
        ContentType: 'text/plain',
      })
      .promise();
  }

  /**
   * Validate execution payload
   */
  private validateExecutionPayload(payload: ExecutionPayload): void {
    if (!payload.workspace_id) throw new Error('workspace_id is required');
    if (!payload.user_id) throw new Error('user_id is required');
    if (!payload.active_file) throw new Error('active_file is required');
    if (!payload.code_files) throw new Error('code_files is required');
  }

  /**
   * Store execution metadata in database
   */
  private async storeExecutionMetadata(
    executionId: string,
    payload: ExecutionPayload,
    language: string
  ): Promise<void> {
    const query = `
      INSERT INTO submissions (
        id, workspace_id, user_id, language, entry_point, status, submitted_at
      ) VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
    `;

    await this.db.query(query, [
      executionId,
      payload.workspace_id,
      payload.user_id,
      language,
      payload.active_file.path,
    ]);
  }

  /**
   * Update execution in Redis cache
   */
  private async updateExecutionInCache(executionId: string, result: ExecutionResult): Promise<void> {
    const cacheKey = `execution:${executionId}`;
    await this.redis.setex(cacheKey, 3600, JSON.stringify(result)); // 1 hour TTL
  }

  /**
   * Save execution results to database
   */
  private async saveExecutionResults(executionId: string, result: ExecutionResult): Promise<void> {
    const query = `
      UPDATE submissions 
      SET 
        status = $2,
        exit_code = $3,
        stdout_output = $4,
        stderr_output = $5,
        compiler_output = $6,
        execution_time_ms = $7,
        cpu_time_ms = $8,
        memory_used_mb = $9,
        peak_memory_mb = $10,
        test_results = $11,
        completed_at = NOW()
      WHERE id = $1
    `;

    await this.db.query(query, [
      executionId,
      result.status,
      result.exit_code,
      result.stdout,
      result.stderr,
      result.compiler_output,
      result.execution_time_ms,
      result.cpu_time_ms,
      result.memory_used_mb,
      result.peak_memory_mb,
      JSON.stringify(result.test_results || []),
    ]);
  }

  /**
   * Generate AI feedback (async, runs in background)
   */
  private async generateAIFeedback(
    executionId: string,
    payload: ExecutionPayload,
    result: ExecutionResult
  ): Promise<void> {
    try {
      // Call AI service async (don't await)
      const feedback = await this.callAIService(payload.code_files, result);

      // Save feedback to database
      await this.db.query(
        `UPDATE submissions SET ai_feedback_generated = true, ai_feedback = $1 WHERE id = $2`,
        [JSON.stringify(feedback), executionId]
      );

      // Notify client
      await this.notifyClient(executionId, { ...result, ai_feedback: feedback });
    } catch (error) {
      console.error(`[Execution ${executionId}] AI feedback generation failed:`, error);
    }
  }

  /**
   * Call AI service for code analysis
   */
  private async callAIService(codeFiles: CodeFile[], result: ExecutionResult): Promise<any> {
    try {
      const response = await axios.post(
        `${process.env.AI_SERVICE_URL}/analyze`,
        {
          code: codeFiles.map((f) => f.content).join('\n\n'),
          execution_result: result,
          analysis_types: ['improvements', 'bugs', 'complexity'],
        },
        {
          timeout: 10000,
          headers: {
            Authorization: `Bearer ${process.env.AI_SERVICE_TOKEN}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('AI service call failed:', error);
      return {};
    }
  }

  /**
   * Notify client via WebSocket
   */
  private async notifyClient(executionId: string, result: ExecutionResult): Promise<void> {
    // This would integrate with Socket.io or similar
    // For now, just emit to local event emitter
    this.eventEmitter.emit(`execution:${executionId}:update`, result);
  }

  // =========================================================================
  // ROUTE HANDLERS
  // =========================================================================

  private async getExecutionStatus(req: Request, res: Response): Promise<void> {
    const { executionId } = req.params;

    try {
      // Try cache first
      const cached = await this.redis.get(`execution:${executionId}`);
      if (cached) {
        res.json(JSON.parse(cached));
        return;
      }

      // Fall back to database
      const result = await this.db.query(
        `SELECT * FROM submissions WHERE id = $1`,
        [executionId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Execution not found' });
        return;
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error retrieving execution status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private async getExecutionResults(req: Request, res: Response): Promise<void> {
    const { executionId } = req.params;

    try {
      const result = await this.db.query(
        `SELECT * FROM submissions WHERE id = $1`,
        [executionId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Execution not found' });
        return;
      }

      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private async getQueueStats(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.db.query(`
        SELECT 
          status,
          COUNT(*) as count,
          AVG(execution_time_ms) as avg_time_ms,
          MAX(execution_time_ms) as max_time_ms
        FROM submissions
        WHERE submitted_at > NOW() - INTERVAL '1 hour'
        GROUP BY status
      `);

      res.json({
        stats: result.rows,
        queue_size: this.executionQueue.size,
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private async handleExecutionWebhook(req: Request, res: Response): Promise<void> {
    const { execution_id, status, result } = req.body;

    try {
      // Update cache and database
      await this.updateExecutionInCache(execution_id, result);
      await this.saveExecutionResults(execution_id, result);

      // Notify clients
      await this.notifyClient(execution_id, result);

      res.json({ success: true });
    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // =========================================================================
  // MIDDLEWARE
  // =========================================================================

  private async authenticateRequest(req: Request, res: Response, next: any): Promise<void> {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      // Verify JWT token (implement your JWT verification logic)
      // For now, just validate token format
      if (token.length < 10) {
        throw new Error('Invalid token');
      }

      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  }

  private globalErrorHandler(err: any, req: Request, res: Response, next: any): void {
    console.error('Unhandled error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
    });
  }

  // =========================================================================
  // STARTUP
  // =========================================================================

  public start(port: number = 3000): void {
    this.app.listen(port, () => {
      console.log(`[CodeVerse Antigravity Router] Listening on port ${port}`);
      console.log(`Supported languages: ${Object.keys(LANGUAGE_CONFIGS).join(', ')}`);
    });
  }
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

const router = new AntigravityRouter();
router.start(parseInt(process.env.PORT || '3000'));

export default router;
