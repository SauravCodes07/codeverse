import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';

interface OTPPageProps {
  email?: string;
  onNavigate?: (page: string) => void;
}

export const OTPPage: React.FC<OTPPageProps> = ({ email = 'you@example.com', onNavigate }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [verified, setVerified] = useState(false);

  // Timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
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
    // API call here
    setTimeout(() => {
      setVerified(true);
      setIsLoading(false);
    }, 1000);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

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
          {!verified ? (
            <>
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Verify Your Email</h1>
                <p className="text-slate-400">We've sent a 6-digit code to <span className="text-white font-semibold">{email}</span></p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6 mb-8">
                {/* OTP Input */}
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-slate-300">Enter Verification Code</label>
                  <div className="flex gap-2 justify-center">
                    {otp.map((value, index) => (
                      <input
                        key={index}
                        type="text"
                        data-index={index}
                        value={value}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        maxLength={1}
                        placeholder="•"
                        className="w-12 h-12 text-center text-2xl font-bold bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition"
                      />
                    ))}
                  </div>
                </div>

                {/* Timer */}
                <div className="text-center">
                  {timeLeft > 0 ? (
                    <p className="text-sm text-slate-400">
                      Code expires in <span className="text-cyan-400 font-semibold">{minutes}:{seconds.toString().padStart(2, '0')}</span>
                    </p>
                  ) : (
                    <p className="text-sm text-red-400">Code has expired. Please request a new one.</p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || otp.some(digit => !digit) || timeLeft <= 0}
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? 'Verifying...' : (
                    <>
                      Verify Code
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Resend Code */}
              <div className="space-y-4">
                <div className="border-t border-slate-700" />
                <div className="text-center">
                  <p className="text-slate-400 text-sm">Didn't receive the code?</p>
                  <button className="text-cyan-400 hover:text-cyan-300 font-semibold transition mt-2">
                    Send Code Again
                  </button>
                </div>
              </div>

              {/* Change Email */}
              <button
                onClick={() => onNavigate?.('login')}
                className="w-full mt-4 text-center text-slate-400 hover:text-white transition text-sm"
              >
                Use a different email
              </button>
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
                <h1 className="text-3xl font-bold text-white mb-2 text-center">Email Verified!</h1>
                <p className="text-slate-400 text-center">Your email has been successfully verified. You can now access your account.</p>
              </div>

              {/* Action Button */}
              <button
                onClick={() => onNavigate?.('login')}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition flex items-center justify-center gap-2"
              >
                Continue to Login
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-500">
          <p>Your verification code is secure and unique to your account</p>
        </div>
      </div>
    </div>
  );
};

export default OTPPage;
