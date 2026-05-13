import React, { useState, useEffect } from 'react';
import { ArrowRight, Code2, ChevronLeft, CheckCircle2, ShieldCheck } from 'lucide-react';
import { PageType } from '../types';
import { Button } from '../components/Button';

interface OTPPageProps {
  email?: string;
  onNavigate?: (page: PageType) => void;
}

export const OTPPage: React.FC<OTPPageProps> = ({ email = 'you@example.com', onNavigate }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.querySelector(`input[data-index="${index + 1}"]`) as HTMLInputElement;
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.querySelector(`input[data-index="${index - 1}"]`) as HTMLInputElement;
      prevInput?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setVerified(true);
      setIsLoading(false);
    }, 1500);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="min-h-screen bg-[#050810] text-slate-200 selection:bg-cyan-500/30 flex items-center justify-center px-6 relative overflow-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="bg-grid absolute inset-0 opacity-20" />
        <div className="blob blob-cyan top-[-10%] left-[-10%] scale-150" />
        <div className="blob blob-purple bottom-[-10%] right-[-10%] scale-150" />
      </div>

      <div className="relative w-full max-w-[480px]">
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

        <div className="glass-card rounded-[32px] p-10 border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-600" />
          
          {!verified ? (
            <>
              <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Verify Email</h1>
                <p className="text-slate-400">We've sent a code to <span className="text-white font-bold">{email}</span></p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="flex gap-3 justify-center">
                  {otp.map((value, index) => (
                    <input
                      key={index}
                      type="text"
                      data-index={index}
                      value={value}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      maxLength={1}
                      className="w-12 h-16 text-center text-3xl font-bold bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 transition-all"
                    />
                  ))}
                </div>

                <div className="text-center">
                  {timeLeft > 0 ? (
                    <p className="text-sm text-slate-500">
                      Resend code in <span className="text-cyan-400 font-bold">{minutes}:{seconds.toString().padStart(2, '0')}</span>
                    </p>
                  ) : (
                    <button className="text-sm text-cyan-400 font-bold hover:underline">Resend code now</button>
                  )}
                </div>

                <Button
                  type="submit"
                  isLoading={isLoading}
                  disabled={otp.some(d => !d) || timeLeft <= 0}
                  className="w-full py-4 text-base"
                  rightIcon={<ArrowRight className="w-5 h-5" />}
                >
                  Verify account
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="w-20 h-20 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-cyan-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">Verification Successful!</h2>
              <p className="text-slate-400 mb-8">
                Your account is now verified. Welcome to the future of cloud development.
              </p>
              <Button 
                className="w-full"
                onClick={() => onNavigate?.('login')}
              >
                Continue to Login
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

        <div className="mt-12 flex items-center justify-center gap-4 opacity-20">
          <ShieldCheck className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest">Secure Verification</span>
        </div>
      </div>
    </div>
  );
};

export default OTPPage;
