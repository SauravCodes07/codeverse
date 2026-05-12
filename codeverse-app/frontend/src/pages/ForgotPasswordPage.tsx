import React, { useState } from 'react';
import { Mail, ArrowRight } from 'lucide-react';

import { PageType } from '../types';

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
    // API call here
    setTimeout(() => {
      setSubmitted(true);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-6">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Back button */}
        <div className="mb-8">
          <a href="/" className="text-slate-400 hover:text-white transition flex items-center gap-2">
            ← Back to Home
          </a>
        </div>

        {/* Card */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-8 shadow-2xl">
          {!submitted ? (
            <>
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Reset Your Password</h1>
                <p className="text-slate-400">Enter your email address and we'll send you a link to reset your password</p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5 mb-8">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || !email}
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? 'Sending...' : (
                    <>
                      Send Reset Link
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Back to login */}
              <p className="text-center text-slate-400">
                Remember your password?{' '}
                <a
                  href="#"
                  onClick={() => onNavigate?.('login')}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold transition"
                >
                  Back to login
                </a>
              </p>
            </>
          ) : (
            <>
              {/* Success Message */}
              <div className="mb-8">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold text-white mb-2 text-center">Check Your Email</h1>
                <p className="text-slate-400 text-center">We've sent a password reset link to <span className="text-white font-semibold">{email}</span></p>
              </div>

              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 mb-8">
                <p className="text-sm text-cyan-200">
                  <strong>Didn't receive the email?</strong> Check your spam folder or try a different email address.
                </p>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setEmail('');
                  }}
                  className="w-full py-3 border border-slate-600 rounded-lg text-white hover:border-cyan-500 transition font-semibold"
                >
                  Try Another Email
                </button>
                <a
                  href="#"
                  onClick={() => onNavigate?.('login')}
                  className="block w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition text-center"
                >
                  Back to Login
                </a>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-500">
          <p>Password reset links expire after 24 hours for security</p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
