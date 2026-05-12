import { create } from 'zustand';

// ============================================================
// TYPES
// ============================================================

export interface CodeFile {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
  isModified: boolean;
  isNew: boolean;
}

export type SidebarPanel = 'explorer' | 'search' | 'git' | 'extensions' | 'database' | 'ai';
export type BottomPanel = 'terminal' | 'output' | 'problems' | 'debug';

export interface TerminalSession {
  id: string;
  name: string;
  output: string;
  isActive: boolean;
}

export interface GitStatus {
  branch: string;
  staged: string[];
  unstaged: string[];
  untracked: string[];
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface BreakPoint {
  fileId: string;
  line: number;
}

interface IDEState {
  // Files
  files: CodeFile[];
  openTabs: string[]; // file IDs
  activeTabId: string | null;
  expandedFolders: Set<string>;

  // Layout
  activeSidebarPanel: SidebarPanel;
  sidebarOpen: boolean;
  sidebarWidth: number;
  bottomPanelOpen: boolean;
  bottomPanelHeight: number;
  activeBottomPanel: BottomPanel;
  aiPanelOpen: boolean;

  // Terminal
  terminals: TerminalSession[];
  activeTerminalId: string | null;

  // AI
  aiMessages: AIMessage[];
  aiContext: string;
  isAIThinking: boolean;

  // Git
  gitStatus: GitStatus | null;
  isRunning: boolean;

  // Debug
  breakpoints: BreakPoint[];
  isDebugging: boolean;

  // Actions — Files
  setFiles: (files: CodeFile[]) => void;
  addFile: (file: CodeFile) => void;
  updateFileContent: (id: string, content: string) => void;
  deleteFile: (id: string) => void;
  renameFile: (id: string, newName: string) => void;
  markFileSaved: (id: string) => void;

  // Actions — Tabs
  openTab: (fileId: string) => void;
  closeTab: (fileId: string) => void;
  setActiveTab: (fileId: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;

  // Actions — Layout
  setSidebarPanel: (panel: SidebarPanel) => void;
  setSidebarOpen: (open: boolean) => void;
  setBottomPanelOpen: (open: boolean) => void;
  setBottomPanel: (panel: BottomPanel) => void;
  setAIPanelOpen: (open: boolean) => void;
  toggleFolder: (path: string) => void;

  // Actions — Terminal
  addTerminal: () => void;
  appendTerminalOutput: (id: string, output: string) => void;
  clearTerminal: (id: string) => void;
  setActiveTerminal: (id: string) => void;

  // Actions — AI
  addAIMessage: (msg: Omit<AIMessage, 'id' | 'timestamp'>) => void;
  setAIThinking: (thinking: boolean) => void;
  clearAIMessages: () => void;

  // Actions — Running
  setIsRunning: (running: boolean) => void;

  // Actions — Git
  setGitStatus: (status: GitStatus | null) => void;

  // Actions — Debug
  toggleBreakpoint: (fileId: string, line: number) => void;
  setDebugging: (debugging: boolean) => void;
}

// ============================================================
// DEFAULT FILES
// ============================================================

const DEFAULT_FILES: CodeFile[] = [
  {
    id: 'file-1',
    name: 'main.ts',
    path: '/src/main.ts',
    language: 'typescript',
    isModified: false,
    isNew: false,
    content: `// Welcome to CodeVerse — the AI-powered cloud IDE
// Start coding or ask the AI Assistant for help

interface Greeting {
  message: string;
  timestamp: Date;
}

function greet(name: string): Greeting {
  return {
    message: \`Hello, \${name}! Welcome to CodeVerse.\`,
    timestamp: new Date(),
  };
}

const result = greet('Developer');
console.log(result.message);
`,
  },
  {
    id: 'file-2',
    name: 'utils.ts',
    path: '/src/utils.ts',
    language: 'typescript',
    isModified: false,
    isNew: false,
    content: `// Utility functions

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const debounce = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};
`,
  },
  {
    id: 'file-3',
    name: 'index.html',
    path: '/public/index.html',
    language: 'html',
    isModified: false,
    isNew: false,
    content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My CodeVerse Project</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`,
  },
];

// ============================================================
// STORE
// ============================================================

export const useIDEStore = create<IDEState>()((set) => ({
  // Initial state
  files: DEFAULT_FILES,
  openTabs: ['file-1', 'file-2'],
  activeTabId: 'file-1',
  expandedFolders: new Set(['/src', '/public']),

  activeSidebarPanel: 'explorer',
  sidebarOpen: true,
  sidebarWidth: 260,
  bottomPanelOpen: true,
  bottomPanelHeight: 220,
  activeBottomPanel: 'terminal',
  aiPanelOpen: true,

  terminals: [
    {
      id: 'term-1',
      name: 'bash',
      output: '\x1b[32m$\x1b[0m Welcome to CodeVerse Terminal\n\x1b[32m$\x1b[0m ',
      isActive: true,
    },
  ],
  activeTerminalId: 'term-1',

  aiMessages: [
    {
      id: 'ai-welcome',
      role: 'assistant',
      content:
        "👋 Hi! I'm your AI coding assistant powered by CodeVerse.\n\nI can help you:\n• **Explain** any code\n• **Generate** functions, components, or entire features\n• **Debug** errors and issues\n• **Refactor** for better performance\n• **Write tests** and documentation\n\nTry commands like `/explain`, `/debug`, `/refactor`, or just ask me anything!",
      timestamp: new Date(),
    },
  ],
  aiContext: '',
  isAIThinking: false,

  gitStatus: {
    branch: 'main',
    staged: [],
    unstaged: ['src/main.ts'],
    untracked: ['src/utils.ts'],
  },
  isRunning: false,

  breakpoints: [],
  isDebugging: false,

  // File actions
  setFiles: (files) => set({ files }),

  addFile: (file) =>
    set((state) => ({
      files: [...state.files, file],
      openTabs: [...state.openTabs, file.id],
      activeTabId: file.id,
    })),

  updateFileContent: (id, content) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id ? { ...f, content, isModified: true } : f
      ),
    })),

  deleteFile: (id) =>
    set((state) => {
      const newTabs = state.openTabs.filter((t) => t !== id);
      const newActiveTab =
        state.activeTabId === id
          ? newTabs[newTabs.length - 1] ?? null
          : state.activeTabId;
      return {
        files: state.files.filter((f) => f.id !== id),
        openTabs: newTabs,
        activeTabId: newActiveTab,
      };
    }),

  renameFile: (id, newName) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id
          ? { ...f, name: newName, path: f.path.replace(f.name, newName) }
          : f
      ),
    })),

  markFileSaved: (id) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id ? { ...f, isModified: false, isNew: false } : f
      ),
    })),

  // Tab actions
  openTab: (fileId) =>
    set((state) => ({
      openTabs: state.openTabs.includes(fileId)
        ? state.openTabs
        : [...state.openTabs, fileId],
      activeTabId: fileId,
    })),

  closeTab: (fileId) =>
    set((state) => {
      const idx = state.openTabs.indexOf(fileId);
      const newTabs = state.openTabs.filter((t) => t !== fileId);
      const newActive =
        state.activeTabId === fileId
          ? newTabs[Math.min(idx, newTabs.length - 1)] ?? null
          : state.activeTabId;
      return { openTabs: newTabs, activeTabId: newActive };
    }),

  setActiveTab: (fileId) => set({ activeTabId: fileId }),

  reorderTabs: (fromIndex, toIndex) =>
    set((state) => {
      const tabs = [...state.openTabs];
      const [moved] = tabs.splice(fromIndex, 1);
      tabs.splice(toIndex, 0, moved);
      return { openTabs: tabs };
    }),

  // Layout actions
  setSidebarPanel: (panel) =>
    set((state) => ({
      activeSidebarPanel: panel,
      sidebarOpen:
        state.activeSidebarPanel === panel ? !state.sidebarOpen : true,
    })),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  setBottomPanelOpen: (open) => set({ bottomPanelOpen: open }),

  setBottomPanel: (panel) =>
    set({ activeBottomPanel: panel, bottomPanelOpen: true }),

  setAIPanelOpen: (open) => set({ aiPanelOpen: open }),

  toggleFolder: (path) =>
    set((state) => {
      const newSet = new Set(state.expandedFolders);
      if (newSet.has(path)) newSet.delete(path);
      else newSet.add(path);
      return { expandedFolders: newSet };
    }),

  // Terminal actions
  addTerminal: () =>
    set((state) => {
      const id = `term-${Date.now()}`;
      const newTerminal: TerminalSession = {
        id,
        name: `bash ${state.terminals.length + 1}`,
        output: '\x1b[32m$\x1b[0m ',
        isActive: true,
      };
      return {
        terminals: [...state.terminals, newTerminal],
        activeTerminalId: id,
      };
    }),

  appendTerminalOutput: (id, output) =>
    set((state) => ({
      terminals: state.terminals.map((t) =>
        t.id === id ? { ...t, output: t.output + output } : t
      ),
    })),

  clearTerminal: (id) =>
    set((state) => ({
      terminals: state.terminals.map((t) =>
        t.id === id ? { ...t, output: '\x1b[32m$\x1b[0m ' } : t
      ),
    })),

  setActiveTerminal: (id) => set({ activeTerminalId: id }),

  // AI actions
  addAIMessage: (msg) => {
    const message: AIMessage = {
      ...msg,
      id: `ai-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
    };
    set((state) => ({ aiMessages: [...state.aiMessages, message] }));
  },

  setAIThinking: (thinking) => set({ isAIThinking: thinking }),

  clearAIMessages: () =>
    set({
      aiMessages: [
        {
          id: 'ai-welcome',
          role: 'assistant',
          content: "Chat cleared. How can I help you?",
          timestamp: new Date(),
        },
      ],
    }),

  // Running
  setIsRunning: (running) => set({ isRunning: running }),

  // Git
  setGitStatus: (status) => set({ gitStatus: status }),

  // Debug
  toggleBreakpoint: (fileId, line) =>
    set((state) => {
      const exists = state.breakpoints.some(
        (b) => b.fileId === fileId && b.line === line
      );
      return {
        breakpoints: exists
          ? state.breakpoints.filter(
              (b) => !(b.fileId === fileId && b.line === line)
            )
          : [...state.breakpoints, { fileId, line }],
      };
    }),

  setDebugging: (debugging) => set({ isDebugging: debugging }),
}));

// Computed selectors
export const selectActiveFile = (state: IDEState) =>
  state.activeTabId
    ? state.files.find((f) => f.id === state.activeTabId) ?? null
    : null;

export const selectOpenFiles = (state: IDEState) =>
  state.openTabs
    .map((id) => state.files.find((f) => f.id === id))
    .filter(Boolean) as CodeFile[];
