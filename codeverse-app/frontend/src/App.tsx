import React, { useEffect, useRef, useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import axios, { AxiosInstance } from 'axios';
import { io, Socket } from 'socket.io-client';
import create from 'zustand';
import { Xterm } from 'xterm';
import 'xterm/css/xterm.css';

// ============================================================================
// TYPES
// ============================================================================

interface CodeFile {
  id?: string;
  name: string;
  path: string;
  content: string;
  language: string;
}

interface ExecutionResult {
  execution_id: string;
  status: string;
  exit_code: number | null;
  stdout: string;
  stderr: string;
  compiler_output?: string;
  execution_time_ms: number;
  memory_used_mb: number;
}

interface Workspace {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  created_at: string;
}

// ============================================================================
// ZUSTAND STORE
// ============================================================================

interface AppStore {
  workspace: Workspace | null;
  files: Map<string, CodeFile>;
  activeFilePath: string;
  isExecuting: boolean;
  terminalOutput: string;
  lastExecution: ExecutionResult | null;
  token: string | null;
  
  setWorkspace: (ws: Workspace) => void;
  setFiles: (files: CodeFile[]) => void;
  setActiveFile: (path: string) => void;
  setFileContent: (path: string, content: string) => void;
  setIsExecuting: (executing: boolean) => void;
  appendTerminalOutput: (output: string) => void;
  clearTerminal: () => void;
  setLastExecution: (result: ExecutionResult) => void;
  setToken: (token: string) => void;
}

const useStore = create<AppStore>((set) => ({
  workspace: null,
  files: new Map(),
  activeFilePath: '',
  isExecuting: false,
  terminalOutput: '',
  lastExecution: null,
  token: localStorage.getItem('token') || null,
  
  setWorkspace: (ws) => set({ workspace: ws }),
  setFiles: (files) => set({ files: new Map(files.map(f => [f.path, f])) }),
  setActiveFile: (path) => set({ activeFilePath: path }),
  setFileContent: (path, content) => set((state) => {
    const files = new Map(state.files);
    const file = files.get(path);
    if (file) {
      file.content = content;
    }
    return { files };
  }),
  setIsExecuting: (executing) => set({ isExecuting: executing }),
  appendTerminalOutput: (output) => set((state) => ({
    terminalOutput: state.terminalOutput + output,
  })),
  clearTerminal: () => set({ terminalOutput: '' }),
  setLastExecution: (result) => set({ lastExecution: result }),
  setToken: (token) => set({ token }),
}));

// ============================================================================
// API SERVICE
// ============================================================================

class CodeVerseAPI {
  private client: AxiosInstance;

  constructor(token?: string) {
    this.client = axios.create({
      baseURL: 'http://localhost:3000',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    });
  }

  async login(email: string, password: string) {
    const response = await this.client.post('/api/v1/auth/login', { email, password });
    return response.data;
  }

  async getWorkspaces() {
    const response = await this.client.get('/api/v1/workspaces');
    return response.data;
  }

  async createWorkspace(name: string, description: string) {
    const response = await this.client.post('/api/v1/workspaces', { name, description });
    return response.data;
  }

  async getFiles(workspaceId: string) {
    const response = await this.client.get(`/api/v1/workspaces/${workspaceId}/files`);
    return response.data;
  }

  async createFile(workspaceId: string, file: CodeFile) {
    const response = await this.client.post(`/api/v1/workspaces/${workspaceId}/files`, file);
    return response.data;
  }

  async updateFile(workspaceId: string, fileId: string, content: string) {
    const response = await this.client.put(`/api/v1/workspaces/${workspaceId}/files/${fileId}`, { content });
    return response.data;
  }

  async executeCode(payload: any) {
    const response = await this.client.post('/api/v1/execute', payload);
    return response.data;
  }

  async getExecutionStatus(executionId: string) {
    const response = await this.client.get(`/api/v1/execution/${executionId}`);
    return response.data;
  }
}

// ============================================================================
// TERMINAL COMPONENT
// ============================================================================

const TerminalComponent: React.FC = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Xterm | null>(null);
  const { terminalOutput } = useStore();

  useEffect(() => {
    if (!terminalRef.current) return;

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

    return () => {
      xterm.dispose();
    };
  }, []);

  useEffect(() => {
    if (xtermRef.current && terminalOutput) {
      xtermRef.current.write(terminalOutput);
    }
  }, [terminalOutput]);

  return (
    <div
      ref={terminalRef}
      style={{
        height: '100%',
        width: '100%',
        backgroundColor: '#1e1e1e',
      }}
    />
  );
};

// ============================================================================
// LOGIN COMPONENT
// ============================================================================

const LoginComponent: React.FC<{ onLogin: (token: string, user: any) => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const api = new CodeVerseAPI();
      const { token, user } = await api.login(email, password);
      localStorage.setItem('token', token);
      onLogin(token, user);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#1e1e1e',
      color: '#d4d4d4',
    }}>
      <div style={{
        width: '400px',
        padding: '40px',
        backgroundColor: '#252526',
        borderRadius: '8px',
        border: '1px solid #3e3e42',
      }}>
        <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>🚀 CodeVerse</h1>
        
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#3e3e42',
                border: '1px solid #555',
                color: '#d4d4d4',
                borderRadius: '4px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#3e3e42',
                border: '1px solid #555',
                color: '#d4d4d4',
                borderRadius: '4px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{ color: '#f48771', marginBottom: '15px', fontSize: '14px' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: loading ? '#555' : '#007acc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '16px',
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#888' }}>
          Demo: Use any email to login
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// WORKSPACE SELECTOR
// ============================================================================

const WorkspaceSelectorComponent: React.FC<{ 
  workspaces: Workspace[];
  onSelectWorkspace: (ws: Workspace) => void;
  onCreateWorkspace: (name: string) => void;
}> = ({ workspaces, onSelectWorkspace, onCreateWorkspace }) => {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = () => {
    if (newName.trim()) {
      onCreateWorkspace(newName);
      setNewName('');
      setShowCreate(false);
    }
  };

  return (
    <div style={{
      width: '250px',
      backgroundColor: '#252526',
      borderRight: '1px solid #3e3e42',
      padding: '20px',
      height: '100%',
      overflowY: 'auto',
    }}>
      <h2 style={{ color: '#d4d4d4', marginTop: 0 }}>Workspaces</h2>

      {showCreate ? (
        <div style={{ marginBottom: '15px' }}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Workspace name"
            style={{
              width: '100%',
              padding: '8px',
              marginBottom: '8px',
              backgroundColor: '#3e3e42',
              border: '1px solid #555',
              color: '#d4d4d4',
              borderRadius: '4px',
              boxSizing: 'border-box',
            }}
            onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
          />
          <button
            onClick={handleCreate}
            style={{
              width: '100%',
              padding: '8px',
              backgroundColor: '#007acc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginBottom: '8px',
            }}
          >
            Create
          </button>
          <button
            onClick={() => setShowCreate(false)}
            style={{
              width: '100%',
              padding: '8px',
              backgroundColor: '#3e3e42',
              color: '#d4d4d4',
              border: '1px solid #555',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          style={{
            width: '100%',
            padding: '8px',
            backgroundColor: '#007acc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginBottom: '15px',
            fontWeight: 'bold',
          }}
        >
          + New Workspace
        </button>
      )}

      {workspaces.map((ws) => (
        <div
          key={ws.id}
          onClick={() => onSelectWorkspace(ws)}
          style={{
            padding: '10px',
            marginBottom: '8px',
            backgroundColor: '#3e3e42',
            border: '1px solid #555',
            borderRadius: '4px',
            cursor: 'pointer',
            color: '#d4d4d4',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = '#3e3e42';
          }}
        >
          {ws.name}
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// MAIN IDE COMPONENT
// ============================================================================

const CodeVerseIDE: React.FC = () => {
  const store = useStore();
  const editorRef = useRef<any>(null);
  const [apiClient, setApiClient] = useState<CodeVerseAPI | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(!!store.token);

  // Login handler
  const handleLogin = (token: string, user: any) => {
    store.setToken(token);
    setIsLoggedIn(true);
    setApiClient(new CodeVerseAPI(token));
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('token');
    store.setToken(null);
    setIsLoggedIn(false);
  };

  // Load workspaces
  useEffect(() => {
    if (!isLoggedIn || !apiClient) return;

    const loadWorkspaces = async () => {
      try {
        const ws = await apiClient.getWorkspaces();
        setWorkspaces(ws);
      } catch (error) {
        console.error('Failed to load workspaces:', error);
      }
    };

    loadWorkspaces();
  }, [isLoggedIn, apiClient]);

  // Handle workspace selection
  const handleSelectWorkspace = async (workspace: Workspace) => {
    store.setWorkspace(workspace);

    if (!apiClient) return;

    try {
      const files = await apiClient.getFiles(workspace.id);
      store.setFiles(files);

      if (files.length > 0) {
        store.setActiveFile(files[0].path);
      }
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  };

  // Handle create workspace
  const handleCreateWorkspace = async (name: string) => {
    if (!apiClient) return;

    try {
      const ws = await apiClient.createWorkspace(name, '');
      setWorkspaces([...workspaces, ws]);
      handleSelectWorkspace(ws);
    } catch (error) {
      console.error('Failed to create workspace:', error);
    }
  };

  // Handle execute code
  const handleExecuteCode = useCallback(async () => {
    if (!store.workspace || !store.activeFilePath || !apiClient) return;

    const activeFile = store.files.get(store.activeFilePath);
    if (!activeFile) return;

    store.setIsExecuting(true);
    store.clearTerminal();

    try {
      const payload = {
        workspace_id: store.workspace.id,
        user_id: 'current-user',
        active_file: activeFile,
        code_files: Array.from(store.files.values()),
      };

      const result = await apiClient.executeCode(payload);
      store.setLastExecution(result);

      if (result.stdout) {
        store.appendTerminalOutput(result.stdout);
      }

      if (result.stderr) {
        store.appendTerminalOutput(`\x1b[31m${result.stderr}\x1b[0m`);
      }
    } catch (error: any) {
      store.appendTerminalOutput(`\x1b[31mExecution Error: ${error.message}\x1b[0m\n`);
    } finally {
      store.setIsExecuting(false);
    }
  }, [store, apiClient]);

  // Handle editor change
  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value && store.activeFilePath) {
      store.setFileContent(store.activeFilePath, value);
    }
  }, [store.activeFilePath, store]);

  if (!isLoggedIn) {
    return <LoginComponent onLogin={handleLogin} />;
  }

  const activeFile = store.activeFilePath ? store.files.get(store.activeFilePath) : null;

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#1e1e1e' }}>
      {/* Workspace Sidebar */}
      <WorkspaceSelectorComponent
        workspaces={workspaces}
        onSelectWorkspace={handleSelectWorkspace}
        onCreateWorkspace={handleCreateWorkspace}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 20px',
          backgroundColor: '#252526',
          borderBottom: '1px solid #3e3e42',
          color: '#d4d4d4',
        }}>
          <div>
            <h2 style={{ margin: '0 10px 0 0', display: 'inline' }}>
              {store.workspace?.name || 'No workspace selected'} / {activeFile?.name || 'No file selected'}
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleExecuteCode}
              disabled={store.isExecuting || !activeFile}
              style={{
                padding: '8px 16px',
                backgroundColor: store.isExecuting ? '#555' : '#007acc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: store.isExecuting ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
              }}
            >
              {store.isExecuting ? '⏳ Running...' : '▶ Run Code'}
            </button>

            <button
              onClick={handleLogout}
              style={{
                padding: '8px 16px',
                backgroundColor: '#555',
                color: '#d4d4d4',
                border: '1px solid #888',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Editor & Terminal Split */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Editor */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {activeFile ? (
              <Editor
                onMount={(editor) => {
                  editorRef.current = editor;
                }}
                value={activeFile.content}
                onChange={handleEditorChange}
                language={activeFile.language}
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
                }}
              />
            ) : (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
                color: '#888',
                fontSize: '18px',
              }}>
                Select a workspace and file to start coding
              </div>
            )}
          </div>

          {/* Terminal */}
          <div style={{ flex: 0.35, borderLeft: '1px solid #3e3e42', overflow: 'hidden' }}>
            <TerminalComponent />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeVerseIDE;
