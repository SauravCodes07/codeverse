import React, { useState } from 'react';
import { Mail, ArrowRight, Code2, ChevronLeft } from 'lucide-react';
import { PageType } from '../types';
import { Button } from '../components/Button';

interface ForgotPasswordPageProps {
  onNavigate?: (page: PageType) => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // API call simulation
    setTimeout(() => {
      setSubmitted(true);
      setIsLoading(false);
    }, 1500);
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
          
          {!submitted ? (
            <>
              <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Reset Password</h1>
                <p className="text-slate-400">We'll send a recovery link to your inbox.</p>
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

                <Button
                  type="submit"
                  isLoading={isLoading}
                  className="w-full py-4 text-base"
                  rightIcon={<ArrowRight className="w-5 h-5" />}
                >
                  Send recovery link
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">Check your email</h2>
              <p className="text-slate-400 mb-8">
                We've sent a link to <span className="text-white font-bold">{email}</span>. Please click the link to reset your password.
              </p>
              <Button 
                variant="secondary" 
                className="w-full"
                onClick={() => setSubmitted(false)}
              >
                Resend email
              </Button>
            </div>
          )}
        </div>

        <button
          onClick={() => onNavigate?.('login')}
          className="mt-8 flex items-center gap-2 text-slate-500 hover:text-white transition-colors mx-auto font-bold text-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to login
        </button>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
