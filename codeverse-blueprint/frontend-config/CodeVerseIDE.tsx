// ============================================================================
// CodeVerse: Frontend - "Antigravity" IDE Experience
// Framework: React + TypeScript + Monaco Editor
// Real-Time Collaboration: Yjs + WebSocket
// ============================================================================

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import axios, { AxiosInstance } from 'axios';
import { io, Socket } from 'socket.io-client';
import { useStore } from 'zustand';
import create from 'zustand';
import { Xterm } from 'xterm';
import 'xterm/css/xterm.css';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface CodeFile {
  name: string;
  path: string;
  content: string;
  language: string;
}

interface ExecutionResult {
  execution_id: string;
  status: 'pending' | 'running' | 'completed' | 'timeout' | 'runtime_error' | 'compilation_error';
  exit_code: number | null;
  stdout: string;
  stderr: string;
  compiler_output?: string;
  execution_time_ms: number;
  memory_used_mb: number;
  test_results?: TestResult[];
}

interface TestResult {
  test_id: string;
  passed: boolean;
  expected: string;
  actual: string;
  execution_time_ms: number;
}

interface WorkspaceState {
  workspace_id: string;
  files: Map<string, CodeFile>;
  active_file_path: string;
  last_execution: ExecutionResult | null;
  is_executing: boolean;
  collaborators: string[];
}

// ============================================================================
// ZUSTAND STORE (State Management)
// ============================================================================

interface AppStore {
  workspace: WorkspaceState;
  execution_history: ExecutionResult[];
  ai_feedback: string | null;
  terminal_output: string;
  
  setWorkspace: (workspace: WorkspaceState) => void;
  setActiveFile: (path: string) => void;
  setFileContent: (path: string, content: string) => void;
  setIsExecuting: (executing: boolean) => void;
  addExecutionResult: (result: ExecutionResult) => void;
  setAIFeedback: (feedback: string) => void;
  appendTerminalOutput: (output: string) => void;
  clearTerminal: () => void;
}

const useAppStore = create<AppStore>((set) => ({
  workspace: {
    workspace_id: '',
    files: new Map(),
    active_file_path: '',
    last_execution: null,
    is_executing: false,
    collaborators: [],
  },
  execution_history: [],
  ai_feedback: null,
  terminal_output: '',
  
  setWorkspace: (workspace) => set({ workspace }),
  setActiveFile: (path) => set((state) => ({
    workspace: { ...state.workspace, active_file_path: path },
  })),
  setFileContent: (path, content) => set((state) => {
    const files = new Map(state.workspace.files);
    const file = files.get(path);
    if (file) {
      file.content = content;
      files.set(path, file);
    }
    return { workspace: { ...state.workspace, files } };
  }),
  setIsExecuting: (executing) => set((state) => ({
    workspace: { ...state.workspace, is_executing: executing },
  })),
  addExecutionResult: (result) => set((state) => ({
    execution_history: [result, ...state.execution_history],
    workspace: { ...state.workspace, last_execution: result },
  })),
  setAIFeedback: (feedback) => set({ ai_feedback: feedback }),
  appendTerminalOutput: (output) => set((state) => ({
    terminal_output: state.terminal_output + output,
  })),
  clearTerminal: () => set({ terminal_output: '' }),
}));

// ============================================================================
// API SERVICE
// ============================================================================

class CodeVerseAPI {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL = 'http://localhost:3000') {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`,
      },
    });
  }

  private getAuthToken(): string {
    // Retrieve JWT from localStorage or session
    return localStorage.getItem('auth_token') || '';
  }

  async executeCode(
    workspace_id: string,
    user_id: string,
    active_file: CodeFile,
    code_files: CodeFile[],
    test_cases?: any[]
  ): Promise<ExecutionResult> {
    try {
      const response = await this.client.post<ExecutionResult>('/api/v1/execute', {
        workspace_id,
        user_id,
        active_file,
        code_files,
        test_cases,
        execution_timeout_seconds: 30,
        memory_limit_mb: 256,
      });

      return response.data;
    } catch (error) {
      throw new Error(`Execution failed: ${error}`);
    }
  }

  async getExecutionStatus(execution_id: string): Promise<ExecutionResult> {
    const response = await this.client.get<ExecutionResult>(
      `/api/v1/execution/${execution_id}`
    );
    return response.data;
  }

  async getQueueStats() {
    const response = await this.client.get('/api/v1/queue/stats');
    return response.data;
  }
}

// ============================================================================
// LANGUAGE SERVER PROTOCOL (LSP) INTEGRATION
// ============================================================================

class LanguageServerManager {
  private socket: Socket;
  private language: string;

  constructor(language: string) {
    this.language = language;
    this.socket = io('http://localhost:3001', {
      query: { language },
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.socket.on('connect', () => {
      console.log(`[LSP] Connected for ${this.language}`);
    });

    this.socket.on('diagnostics', (diagnostics: any) => {
      // Emit diagnostics to Monaco editor
      this.emitDiagnostics(diagnostics);
    });

    this.socket.on('completion', (completions: any) => {
      // Provide completions to Monaco editor
      this.emitCompletions(completions);
    });
  }

  async requestIntelliSense(
    file_path: string,
    content: string,
    line: number,
    column: number
  ): Promise<any> {
    return new Promise((resolve) => {
      const requestId = Math.random().toString();
      this.socket.emit('intellisense', {
        request_id: requestId,
        file_path,
        content,
        line,
        column,
      });

      this.socket.once(`intellisense-${requestId}`, (response) => {
        resolve(response);
      });
    });
  }

  private emitDiagnostics(diagnostics: any): void {
    window.dispatchEvent(new CustomEvent('lsp:diagnostics', { detail: diagnostics }));
  }

  private emitCompletions(completions: any): void {
    window.dispatchEvent(new CustomEvent('lsp:completions', { detail: completions }));
  }

  disconnect(): void {
    this.socket.disconnect();
  }
}

// ============================================================================
// REAL-TIME COLLABORATION (CRDT)
// ============================================================================

class CollaborationManager {
  private ydoc: Y.Doc;
  private ytext: Y.Text;
  private provider: WebsocketProvider;
  private awareness: any;

  constructor(workspace_id: string, user_id: string) {
    // Create Yjs document for conflict-free collaborative editing
    this.ydoc = new Y.Doc();
    this.ytext = this.ydoc.getText('shared-text');

    // Connect to WebSocket provider
    this.provider = new WebsocketProvider(
      'ws://localhost:3001',
      `workspace-${workspace_id}`,
      this.ydoc
    );

    // Setup awareness for live cursors
    this.awareness = this.provider.awareness;
    this.awareness.setLocalState({
      user_id,
      cursor_line: 0,
      cursor_column: 0,
      color: this.getRandomColor(),
    });
  }

  bindToMonaco(editor: any, model: any): void {
    // Bind Monaco editor to Yjs for real-time sync
    new MonacoBinding(
      this.ytext,
      model,
      new Set([editor]),
      this.awareness
    );
  }

  onRemoteCursor(callback: (user: any) => void): void {
    this.awareness.on('change', (changes: any) => {
      changes.added.concat(changes.updated).forEach((clientID: number) => {
        const state = this.awareness.getStates().get(clientID);
        if (state) {
          callback(state);
        }
      });
    });
  }

  private getRandomColor(): string {
    const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  destroy(): void {
    this.provider.destroy();
    this.ydoc.destroy();
  }
}

// ============================================================================
// TERMINAL COMPONENT
// ============================================================================

interface TerminalProps {
  onOutput?: (output: string) => void;
}

const TerminalComponent: React.FC<TerminalProps> = ({ onOutput }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Xterm | null>(null);
  const store = useAppStore();

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm
    const xterm = new Xterm({
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
      },
      fontSize: 12,
      lineHeight: 1.5,
    });

    xterm.open(terminalRef.current);
    xtermRef.current = xterm;

    // Write existing output
    xterm.write(store.terminal_output);

    return () => {
      xterm.dispose();
    };
  }, []);

  useEffect(() => {
    if (!xtermRef.current) return;

    // Subscribe to terminal output changes
    const handleOutput = (output: string) => {
      xtermRef.current?.write(output);
    };

    window.addEventListener('terminal:output', ((e: any) => {
      handleOutput(e.detail);
    }) as EventListener);

    return () => {
      window.removeEventListener('terminal:output', handleOutput as EventListener);
    };
  }, []);

  return (
    <div
      ref={terminalRef}
      style={{
        height: '100%',
        width: '100%',
        backgroundColor: '#1e1e1e',
        borderTop: '1px solid #333',
      }}
    />
  );
};

// ============================================================================
// MAIN IDE COMPONENT
// ============================================================================

interface CodeVerseIDEProps {
  workspace_id: string;
  user_id: string;
}

const CodeVerseIDE: React.FC<CodeVerseIDEProps> = ({ workspace_id, user_id }) => {
  const editorRef = useRef<any>(null);
  const store = useAppStore();
  const [lspManager, setLspManager] = useState<LanguageServerManager | null>(null);
  const [collaborationManager, setCollaborationManager] = useState<CollaborationManager | null>(null);
  const apiClient = useRef(new CodeVerseAPI());

  // Initialize workspace and file structure
  useEffect(() => {
    // Load workspace files from backend
    const fetchWorkspace = async () => {
      try {
        const response = await apiClient.current.client.get(`/api/v1/workspaces/${workspace_id}`);
        const workspace = response.data;
        
        store.setWorkspace({
          workspace_id,
          files: new Map(workspace.files.map((f: any) => [f.path, f])),
          active_file_path: workspace.files[0]?.path || '',
          last_execution: null,
          is_executing: false,
          collaborators: [],
        });
      } catch (error) {
        console.error('Failed to load workspace:', error);
      }
    };

    fetchWorkspace();
  }, [workspace_id]);

  // Initialize LSP and collaboration
  useEffect(() => {
    if (!store.workspace.active_file_path) return;

    const activeFile = store.workspace.files.get(store.workspace.active_file_path);
    if (!activeFile) return;

    // Initialize LSP for the language
    const lsp = new LanguageServerManager(activeFile.language);
    setLspManager(lsp);

    // Initialize collaboration
    const collab = new CollaborationManager(workspace_id, user_id);
    setCollaborationManager(collab);

    // Bind collaboration to editor when editor is ready
    const onEditorReady = setInterval(() => {
      if (editorRef.current) {
        collab.bindToMonaco(editorRef.current, editorRef.current.getModel());
        clearInterval(onEditorReady);
      }
    }, 100);

    // Listen to remote cursor changes
    collab.onRemoteCursor((user) => {
      console.log(`Cursor from ${user.user_id}:`, user.cursor_line, user.cursor_column);
    });

    return () => {
      lsp.disconnect();
      collab.destroy();
    };
  }, [store.workspace.active_file_path]);

  // Handle editor changes
  const handleEditorChange = useCallback((value: string | undefined) => {
    if (!value) return;

    const activeFile = store.workspace.files.get(store.workspace.active_file_path);
    if (activeFile) {
      store.setFileContent(store.workspace.active_file_path, value);
      
      // Request diagnostics from LSP
      if (lspManager) {
        lspManager.requestIntelliSense(
          activeFile.path,
          value,
          0,
          0
        ).catch(() => {});
      }
    }
  }, [store.workspace.active_file_path, store.workspace.files]);

  // Handle code execution
  const handleExecuteCode = useCallback(async () => {
    const activeFile = store.workspace.files.get(store.workspace.active_file_path);
    if (!activeFile) return;

    store.setIsExecuting(true);
    store.clearTerminal();

    try {
      // Send execution request
      const initialResult = await apiClient.current.executeCode(
        workspace_id,
        user_id,
        activeFile,
        Array.from(store.workspace.files.values()),
        []
      );

      // Poll for completion
      let result = initialResult;
      let pollCount = 0;
      const maxPolls = 60; // 30 seconds with 500ms intervals

      while (result.status === 'pending' || result.status === 'running') {
        if (pollCount >= maxPolls) {
          result.status = 'timeout';
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
        result = await apiClient.current.getExecutionStatus(result.execution_id);
        pollCount++;
      }

      // Write output to terminal
      if (result.stdout) {
        window.dispatchEvent(
          new CustomEvent('terminal:output', { detail: result.stdout })
        );
      }

      if (result.stderr) {
        window.dispatchEvent(
          new CustomEvent('terminal:output', { 
            detail: `\x1b[31m${result.stderr}\x1b[0m` // Red color for errors
          })
        );
      }

      // Store execution result
      store.addExecutionResult(result);

      // Request AI feedback
      if (result.status === 'completed' && result.exit_code !== 0) {
        requestAIFeedback(activeFile, result);
      }
    } catch (error) {
      const errorMessage = `\x1b[31mExecution Error: ${error}\x1b[0m`;
      window.dispatchEvent(
        new CustomEvent('terminal:output', { detail: errorMessage })
      );
    } finally {
      store.setIsExecuting(false);
    }
  }, [workspace_id, user_id, store.workspace.active_file_path]);

  // Request AI feedback via WebSocket
  const requestAIFeedback = (file: CodeFile, result: ExecutionResult) => {
    const socket = io('http://localhost:3001');
    socket.emit('ai:request-feedback', {
      code: file.content,
      language: file.language,
      execution_result: result,
    });

    socket.on('ai:feedback-ready', (feedback: { improvements: string[]; bugs: string[] }) => {
      const feedbackText = `
📊 AI Feedback:
\n${feedback.improvements.map((i) => `✓ ${i}`).join('\n')}
\n${feedback.bugs.map((b) => `⚠ ${b}`).join('\n')}
      `.trim();

      store.setAIFeedback(feedbackText);
      window.dispatchEvent(
        new CustomEvent('ai:feedback', { detail: feedback })
      );
    });
  };

  const activeFile = store.workspace.files.get(store.workspace.active_file_path);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#1e1e1e' }}>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 20px',
          backgroundColor: '#252526',
          borderBottom: '1px solid #3e3e42',
          color: '#d4d4d4',
        }}
      >
        <div>
          <h2 style={{ margin: '0 10px 0 0', display: 'inline' }}>
            {activeFile?.name || 'No file selected'}
          </h2>
        </div>

        <button
          onClick={handleExecuteCode}
          disabled={store.workspace.is_executing}
          style={{
            padding: '8px 16px',
            backgroundColor: store.workspace.is_executing ? '#555' : '#007acc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: store.workspace.is_executing ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          {store.workspace.is_executing ? '⏳ Running...' : '▶ Run Code'}
        </button>
      </div>

      {/* Editor & Terminal Split */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Editor */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Editor
            onMount={(editor) => {
              editorRef.current = editor;
            }}
            value={activeFile?.content || ''}
            onChange={handleEditorChange}
            language={activeFile?.language || 'plaintext'}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              formatOnPaste: true,
              formatOnType: true,
              autoClosingBrackets: 'always',
              autoClosingQuotes: 'always',
              suggestOnTriggerCharacters: true,
            }}
          />
        </div>

        {/* Terminal */}
        <div style={{ flex: 0.4, borderLeft: '1px solid #3e3e42', overflow: 'hidden' }}>
          <TerminalComponent />
        </div>
      </div>

      {/* AI Feedback Panel */}
      {store.ai_feedback && (
        <div
          style={{
            padding: '10px 20px',
            backgroundColor: '#1f4788',
            color: '#d4d4d4',
            borderTop: '1px solid #3e3e42',
            maxHeight: '100px',
            overflowY: 'auto',
            fontSize: '12px',
          }}
        >
          <strong>💡 AI Suggestions:</strong>
          <pre style={{ margin: '5px 0 0 0', whiteSpace: 'pre-wrap' }}>
            {store.ai_feedback}
          </pre>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// APP COMPONENT
// ============================================================================

const App: React.FC = () => {
  const [workspace_id] = useState('workspace-123');
  const [user_id] = useState('user-456');

  return (
    <CodeVerseIDE workspace_id={workspace_id} user_id={user_id} />
  );
};

export default App;
