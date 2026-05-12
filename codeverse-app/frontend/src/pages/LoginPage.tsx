import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, GitBranch, Globe, Shield, Sparkles, Code2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

import { PageType } from '../types';

interface LoginPageProps {
  onNavigate?: (page: PageType) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setAuth, addNotification } = useAppStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      setAuth(data.user, data.token);
      addNotification({ type: 'success', message: 'Welcome back, ' + data.user.full_name });
      onNavigate?.('ide');
    } catch (error: any) {
      addNotification({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050810] text-slate-200 selection:bg-cyan-500/30 flex items-center justify-center px-6 relative overflow-hidden">
      {/* Background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="bg-grid absolute inset-0 opacity-20" />
        <div className="blob blob-cyan top-[-10%] left-[-10%] scale-150 animate-pulse-glow" />
        <div className="blob blob-purple bottom-[-10%] right-[-10%] scale-150 animate-pulse-glow delay-500" />
      </div>

      <div className="relative w-full max-w-[440px] animate-slide-up">
        {/* Logo */}
        <div 
          onClick={() => onNavigate?.('landing')}
          className="flex items-center gap-3 mb-10 justify-center cursor-pointer group"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-110 transition-transform">
            <Code2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            Code<span className="text-cyan-400">Verse</span>
          </span>
        </div>

        {/* Card */}
        <div className="glass-card rounded-[32px] p-10 border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-600" />
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Welcome Back</h1>
            <p className="text-slate-400">Enter your credentials to access your studio.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300 ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-semibold text-slate-300">Password</label>
                <button 
                  type="button"
                  onClick={() => onNavigate?.('forgot')}
                  className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-4 rounded-2xl text-base shadow-xl shadow-cyan-500/20 group"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </div>
              ) : (
                <>
                  Sign In to CodeVerse
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-4 bg-[#0d111a] text-slate-500 font-bold uppercase tracking-widest">Or continue with</span>
            </div>
          </div>

          {/* OAuth Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-sm font-bold">
              <GitBranch className="w-5 h-5" />
              GitHub
            </button>
            <button className="flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-sm font-bold">
              <Globe className="w-5 h-5" />
              Google
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-slate-500 text-sm">
          New to the verse?{' '}
          <button
            onClick={() => onNavigate?.('register')}
            className="text-white font-bold hover:text-cyan-400 transition-colors"
          >
            Create an account
          </button>
        </p>

        <div className="mt-12 flex items-center justify-center gap-6 opacity-40">
          <Shield className="w-5 h-5" />
          <div className="h-4 w-px bg-slate-700" />
          <Sparkles className="w-5 h-5" />
          <div className="h-4 w-px bg-slate-700" />
          <Lock className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
