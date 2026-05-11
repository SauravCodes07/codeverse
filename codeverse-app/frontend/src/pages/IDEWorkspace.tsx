import React, { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { 
  FileText, Folder, Search, GitBranch, Settings, Play, Terminal, Bug,
  Send, MessageSquare, Plus, X, Share2, Save, Download, Menu, LogOut,
  Users, Maximize2, Copy, Eye
} from 'lucide-react';

interface File {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
}

interface AIMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const IDEWorkspace: React.FC = () => {
  // State
  const [files, setFiles] = useState<File[]>([
    {
      id: '1',
      name: 'index.tsx',
      path: '/src/index.tsx',
      content: `import React from 'react';\nimport { createRoot } from 'react-dom/client';\nimport App from './App';\n\nconst container = document.getElementById('root');\nconst root = createRoot(container!);\nroot.render(<App />);`,
      language: 'typescript',
    },
    {
      id: '2',
      name: 'App.tsx',
      path: '/src/App.tsx',
      content: `import React, { useState } from 'react';\n\nfunction App() {\n  const [count, setCount] = useState(0);\n\n  return (\n    <div className="container">\n      <h1>Welcome to CodeVerse</h1>\n      <button onClick={() => setCount(count + 1)}>\n        Count: {count}\n      </button>\n    </div>\n  );\n}\n\nexport default App;`,
      language: 'typescript',
    },
  ]);
  const [activeFileId, setActiveFileId] = useState<string>('1');
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string>('> Ready to execute code\n');
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I\'m your AI coding assistant. How can I help you today? You can ask me to:\n- Explain code\n- Generate code\n- Debug issues\n- Optimize performance\n- Write tests',
      timestamp: new Date(),
    },
  ]);
  const [aiInput, setAiInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalOutput]);

  const activeFile = files.find(f => f.id === activeFileId);

  const handleFileChange = (content: string) => {
    setFiles(files.map(f => 
      f.id === activeFileId ? { ...f, content } : f
    ));
  };

  const handleRunCode = () => {
    setIsRunning(true);
    setTerminalOutput(prev => prev + '\n$ npm run build\n> Building your code...\n');
    
    setTimeout(() => {
      setTerminalOutput(prev => prev + '✓ Build successful\n> Executing...\n');
    }, 1000);

    setTimeout(() => {
      setTerminalOutput(prev => prev + 'Output: Hello from CodeVerse!\n$ ');
      setIsRunning(false);
    }, 2000);
  };

  const handleAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: aiInput,
      timestamp: new Date(),
    };

    setAiMessages([...aiMessages, userMessage]);
    setAiInput('');

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        'That\'s a great question! Let me help you with that.',
        'I can definitely help you optimize that code.',
        'Here\'s a suggestion for improving your code quality.',
        'I found a potential issue in your code. Let me explain...',
      ];
      
      const assistantMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date(),
      };

      setAiMessages(prev => [...prev, assistantMessage]);
    }, 800);
  };

  const handleCreateFile = () => {
    const newFile: File = {
      id: Date.now().toString(),
      name: 'untitled.js',
      path: `/src/untitled.js`,
      content: '',
      language: 'javascript',
    };
    setFiles([...files, newFile]);
    setActiveFileId(newFile.id);
  };

  const handleDeleteFile = (fileId: string) => {
    if (files.length === 1) return;
    const newFiles = files.filter(f => f.id !== fileId);
    setFiles(newFiles);
    if (activeFileId === fileId) {
      setActiveFileId(newFiles[0].id);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      {/* LEFT SIDEBAR */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 overflow-hidden`}>
        {/* Sidebar Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-slate-800">
          {sidebarOpen && <span className="font-semibold text-cyan-400">EXPLORER</span>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-slate-800 rounded"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* File Explorer */}
        {sidebarOpen && (
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <div className="mb-4">
              <button
                onClick={handleCreateFile}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-800 rounded text-sm text-slate-300 hover:text-white"
              >
                <Plus className="w-4 h-4" />
                New File
              </button>
            </div>

            <div>
              <div className="flex items-center gap-2 px-3 py-1 text-slate-400 text-sm">
                <Folder className="w-4 h-4" />
                <span>src</span>
              </div>
              <div className="ml-4 space-y-1">
                {files.map(file => (
                  <div
                    key={file.id}
                    onClick={() => setActiveFileId(file.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition ${
                      activeFileId === file.id
                        ? 'bg-slate-800 text-cyan-400'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span className="text-sm flex-1 truncate">{file.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFile(file.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Sidebar Footer */}
        <div className="h-14 border-t border-slate-800 flex items-center justify-around px-2">
          <button className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white" title="Search">
            <Search className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white" title="Git">
            <GitBranch className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white" title="Settings">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* MAIN EDITOR */}
      <div className="flex-1 flex flex-col">
        {/* TOP BAR */}
        <div className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-white">CodeVerse IDE</span>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <GitBranch className="w-4 h-4" />
              <span>main</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunCode}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg hover:shadow-green-500/50 transition disabled:opacity-50 font-semibold"
            >
              <Play className="w-4 h-4" />
              {isRunning ? 'Running...' : 'Run'}
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-700 text-white rounded-lg hover:border-cyan-500 transition">
              <Download className="w-4 h-4" />
              Deploy
            </button>
            <button className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
              <Share2 className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
              <Users className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="h-10 bg-slate-900 border-b border-slate-800 flex items-center gap-2 px-4 overflow-x-auto">
          {files.map(file => (
            <button
              key={file.id}
              onClick={() => setActiveFileId(file.id)}
              className={`flex items-center gap-2 px-4 h-full text-sm whitespace-nowrap transition border-b-2 ${
                activeFileId === file.id
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              {file.name}
            </button>
          ))}
        </div>

        {/* EDITOR & AI PANEL */}
        <div className="flex-1 flex overflow-hidden">
          {/* Editor */}
          <div className={`${aiPanelOpen ? 'flex-1' : 'w-full'} flex flex-col bg-slate-950`}>
            {activeFile && (
              <Editor
                height="100%"
                language={activeFile.language}
                value={activeFile.content}
                onChange={(value) => handleFileChange(value || '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: true },
                  fontSize: 14,
                  fontFamily: 'Fira Code, monospace',
                  tabSize: 2,
                  wordWrap: 'on',
                  automaticLayout: true,
                }}
              />
            )}
          </div>

          {/* AI ASSISTANT PANEL */}
          {aiPanelOpen && (
            <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col">
              {/* Panel Header */}
              <div className="h-14 flex items-center justify-between px-4 border-b border-slate-800">
                <span className="font-semibold text-white">AI Assistant</span>
                <button
                  onClick={() => setAiPanelOpen(false)}
                  className="p-1 hover:bg-slate-800 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {aiMessages.map(msg => (
                  <div key={msg.id} className={`flex gap-3 ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      msg.type === 'user'
                        ? 'bg-cyan-600 text-white'
                        : 'bg-slate-700 text-slate-300'
                    }`}>
                      {msg.type === 'user' ? 'U' : 'AI'}
                    </div>
                    <div className={`max-w-xs rounded-lg px-4 py-2 text-sm ${
                      msg.type === 'user'
                        ? 'bg-cyan-600/20 text-cyan-200'
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                <div ref={terminalEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleAiSubmit} className="p-4 border-t border-slate-800">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder="Ask AI to help..."
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="submit"
                    className="p-2 bg-cyan-600 hover:bg-cyan-700 rounded text-white transition"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* BOTTOM TERMINAL */}
        {terminalOpen && (
          <div className="h-64 bg-slate-950 border-t border-slate-800 flex flex-col">
            {/* Terminal Header */}
            <div className="h-10 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-900">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Terminal className="w-4 h-4" />
                <span>Terminal</span>
              </div>
              <button
                onClick={() => setTerminalOpen(false)}
                className="p-1 hover:bg-slate-800 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Terminal Content */}
            <div className="flex-1 overflow-y-auto p-4 font-mono text-sm text-slate-300 bg-black/30">
              <pre className="whitespace-pre-wrap">{terminalOutput}</pre>
              <div ref={terminalEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Floating AI Button */}
      {!aiPanelOpen && (
        <button
          onClick={() => setAiPanelOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full shadow-lg hover:shadow-cyan-500/50 flex items-center justify-center text-white transition"
          title="Open AI Assistant"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};

export default IDEWorkspace;
