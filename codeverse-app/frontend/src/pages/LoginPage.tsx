import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, GitBranch as Github, Globe, Shield, Sparkles, Code2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { PageType } from '../types';
import { Button } from '../components/Button';
import { api } from '../lib/api';

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
      const data = await api.login({ email, password });

      if (data.error) {
        throw new Error(data.error);
      }

      setAuth(data.user, data.token);
      addNotification({ type: 'success', message: 'Welcome back, ' + (data.user.full_name || data.user.username) });
      onNavigate?.('ide');
    } catch (error: any) {
      addNotification({ type: 'error', message: error.message || 'Login failed' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = (provider: 'google' | 'github') => {
    window.location.href = `${api.getBaseUrl()}/auth/${provider}`;
  };

  return (
    <div className="min-h-screen bg-[#050810] text-slate-200 selection:bg-cyan-500/30 flex items-center justify-center px-6 relative overflow-hidden">
      {/* Background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="bg-grid absolute inset-0 opacity-20" />
        <div className="blob blob-cyan top-[-10%] left-[-10%] scale-150" />
        <div className="blob blob-purple bottom-[-10%] right-[-10%] scale-150" />
      </div>

      <div className="relative w-full max-w-[440px]">
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
          
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Welcome Back</h1>
            <p className="text-slate-400">Enter your credentials to access your studio.</p>
          </div>

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

            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full py-4 text-base"
              rightIcon={<ArrowRight className="w-5 h-5" />}
            >
              Sign In to CodeVerse
            </Button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-4 bg-[#0d111a] text-slate-500 font-bold uppercase tracking-widest">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button 
              variant="secondary" 
              onClick={() => handleOAuth('github')}
              leftIcon={<Github className="w-5 h-5" />}
            >
              GitHub
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => handleOAuth('google')}
              leftIcon={<Globe className="w-5 h-5" />}
            >
              Google
            </Button>
          </div>
        </div>

        <p className="mt-8 text-center text-slate-500 text-sm">
          New to the verse?{' '}
          <button
            onClick={() => onNavigate?.('register')}
            className="text-white font-bold hover:text-cyan-400 transition-colors"
          >
            Create an account
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
