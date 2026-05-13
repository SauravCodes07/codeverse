import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, Github, Globe, Shield, Sparkles, Code2, AtSign, Check } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { PageType } from '../types';
import { Button } from '../components/Button';

interface RegisterPageProps {
  onNavigate?: (page: PageType) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { setAuth, addNotification } = useAppStore();

  const passwordStrength = {
    length: formData.password.length >= 8,
    uppercase: /[A-Z]/.test(formData.password),
    lowercase: /[a-z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
  };

  const allChecks = Object.values(passwordStrength).every(Boolean);
  const passwordsMatch = formData.password === formData.confirmPassword && formData.password !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordsMatch) {
      addNotification({ type: 'error', message: 'Passwords do not match' });
      return;
    }
    
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          username: formData.username,
          password: formData.password,
          fullName: formData.fullName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setAuth(data.user, data.token);
      addNotification({ type: 'success', message: 'Account created! Welcome to CodeVerse, ' + data.user.full_name });
      onNavigate?.('ide');
    } catch (error: any) {
      addNotification({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = (provider: 'google' | 'github') => {
    window.location.href = `http://localhost:3000/api/v1/auth/${provider}`;
  };

  return (
    <div className="min-h-screen bg-[#050810] text-slate-200 selection:bg-cyan-500/30 flex items-center justify-center px-6 relative overflow-hidden">
      {/* Background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="bg-grid absolute inset-0 opacity-20" />
        <div className="blob blob-cyan top-[-10%] right-[-10%] scale-150" />
        <div className="blob blob-purple bottom-[-10%] left-[-10%] scale-150" />
      </div>

      <div className="relative w-full max-w-[480px] py-10">
        {/* Logo */}
        <div 
          onClick={() => onNavigate?.('landing')}
          className="flex items-center gap-3 mb-8 justify-center cursor-pointer group"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-110 transition-transform">
            <Code2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            Code<span className="text-cyan-400">Verse</span>
          </span>
        </div>

        {/* Card */}
        <div className="glass-card rounded-[32px] p-8 border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-600" />
          
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">Create your account</h1>
            <p className="text-slate-400 text-sm">Join the next generation of developers.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 ml-1">Full Name</label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="John Doe"
                    className="w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 ml-1">Username</label>
                <div className="relative group">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="johndoe"
                    className="w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 ml-1">Confirm</label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                  <input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Password strength indicators */}
            {formData.password && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 ml-1 py-1">
                {[
                  { label: '8+ chars', check: passwordStrength.length },
                  { label: 'Uppercase', check: passwordStrength.uppercase },
                  { label: 'Lowercase', check: passwordStrength.lowercase },
                  { label: 'Number', check: passwordStrength.number },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px]">
                    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${item.check ? 'bg-green-500/20' : 'bg-white/5'}`}>
                      {item.check && <Check className="w-2.5 h-2.5 text-green-400" />}
                    </div>
                    <span className={item.check ? 'text-green-400 font-bold' : 'text-slate-500'}>{item.label}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center mt-0.5">
                  <input
                    type="checkbox"
                    required
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="w-5 h-5 border-2 border-white/10 rounded-lg peer-checked:bg-cyan-500 peer-checked:border-cyan-500 transition-all" />
                  <Check className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                </div>
                <span className="text-xs text-slate-400 leading-relaxed">
                  I agree to the <span className="text-cyan-400 font-bold hover:underline">Terms</span> and <span className="text-cyan-400 font-bold hover:underline">Privacy Policy</span>.
                </span>
              </label>
            </div>

            <Button
              type="submit"
              disabled={!agreeTerms || !allChecks || !passwordsMatch}
              isLoading={isLoading}
              className="w-full py-3.5 text-sm mt-2"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Create Free Account
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5" />
            </div>
            <div className="relative flex justify-center text-[10px]">
              <span className="px-3 bg-[#0d111a] text-slate-500 font-bold uppercase tracking-[0.2em]">Social Connect</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="secondary" 
              onClick={() => handleOAuth('github')}
              leftIcon={<Github className="w-4 h-4" />}
              size="sm"
            >
              GitHub
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => handleOAuth('google')}
              leftIcon={<Globe className="w-4 h-4" />}
              size="sm"
            >
              Google
            </Button>
          </div>
        </div>

        <p className="mt-6 text-center text-slate-500 text-sm">
          Already a citizen?{' '}
          <button
            onClick={() => onNavigate?.('login')}
            className="text-white font-bold hover:text-cyan-400 transition-colors"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
