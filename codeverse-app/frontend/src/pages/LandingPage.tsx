import React, { useState, useEffect } from 'react';
import { ArrowRight, Code2, Zap, Users, Shield, Cpu, Sparkles, Terminal, Globe, Lock, X } from 'lucide-react';
import { PageType } from '../types';

interface AnimatedCodeProps {
  lines: string[];
}

interface LandingPageProps {
  onNavigate?: (page: PageType) => void;
}

const AnimatedCode: React.FC<AnimatedCodeProps> = ({ lines }) => {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);

  useEffect(() => {
    if (!lines || !Array.isArray(lines)) return;
    setDisplayedLines([]); // Reset when lines change
    let currentLine = 0;
    const interval = setInterval(() => {
      if (currentLine < lines.length) {
        setDisplayedLines(prev => [...prev, lines[currentLine]]);
        currentLine++;
      } else {
        clearInterval(interval);
      }
    }, 150);
    return () => clearInterval(interval);
  }, [lines]);

  return (
    <div className="font-mono text-sm space-y-1 overflow-hidden">
      {displayedLines.map((line, i) => {
        if (typeof line !== 'string') return null;
        const isKeyword = line.includes('const') || line.includes('return') || line.includes('await') || line.includes('async');
        const isString = line.includes('"') || line.includes("'");
        const colorClass = isKeyword ? 'text-purple-400' : isString ? 'text-green-400' : 'text-blue-400';
        
        return (
          <div key={i} className="flex gap-4 group">
            <span className="text-slate-600 select-none w-4">{i + 1}</span>
            <span className={colorClass}>
              {line}
            </span>
          </div>
        );
      })}
      <div className="w-2 h-5 bg-cyan-400 animate-pulse ml-8" />
    </div>
  );
};

const codeLines = [
  'const buildFuture = async () => {',
  '  const result = await aiCoder.generate({',
  '    task: "Build something amazing",',
  '    language: "typescript",',
  '    quality: "production",',
  '  });',
  '  return result.deploy();',
  '}',
];

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {

  const features = [
    {
      icon: <Sparkles className="w-6 h-6 text-cyan-400" />,
      title: 'AI Code Generation',
      description: 'Generate production-ready code with our advanced AI assistant powered by state-of-the-art models.',
    },
    {
      icon: <Users className="w-6 h-6 text-blue-400" />,
      title: 'Live Collaboration',
      description: 'Code together in real-time with cursor positions, presence indicators, and shared terminals.',
    },
    {
      icon: <Terminal className="w-6 h-6 text-purple-400" />,
      title: 'Cloud Terminals',
      description: 'Fully interactive, isolated Linux terminals with root access and pre-installed toolchains.',
    },
    {
      icon: <Globe className="w-6 h-6 text-green-400" />,
      title: 'Instant Preview',
      description: 'See your changes instantly with hot-reloading and custom staging URLs for every branch.',
    },
    {
      icon: <Lock className="w-6 h-6 text-red-400" />,
      title: 'Secure Sandbox',
      description: 'Your code runs in isolated gVisor containers, ensuring maximum security and resource isolation.',
    },
    {
      icon: <Zap className="w-6 h-6 text-yellow-400" />,
      title: 'One-Click Deploy',
      description: 'Go from code to production in seconds with integrated CI/CD and multi-cloud support.',
    },
  ];

  const [showDemo, setShowDemo] = useState(false);

  const handleDownload = (os: string) => {
    alert(`Starting download for CodeVerse ${os} v1.0.0...`);
  };

  return (
    <div className="min-h-screen bg-[#050810] text-slate-200 selection:bg-cyan-500/30">
      {/* Demo Modal */}
      {showDemo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-4xl aspect-video glass-card rounded-3xl overflow-hidden border-cyan-500/30">
            <button 
              onClick={() => setShowDemo(false)}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white transition z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
              <div className="text-center">
                <Sparkles className="w-16 h-16 text-cyan-400 mx-auto mb-4 animate-pulse" />
                <h3 className="text-2xl font-bold text-white mb-2">CodeVerse Interactive Demo</h3>
                <p className="text-slate-400">Our cinematic demo is loading... Prepare for the future of coding.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="bg-grid absolute inset-0 opacity-20" />
        <div className="blob blob-cyan top-[-10%] left-[-10%] scale-150 animate-pulse-glow" />
        <div className="blob blob-purple bottom-[-10%] right-[-10%] scale-150 animate-pulse-glow delay-500" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#050810]/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-110 transition-transform">
              <Code2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">
              Code<span className="text-cyan-400">Verse</span>
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            {['Features', 'Solutions', 'Pricing', 'Docs'].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-sm font-medium text-slate-400 hover:text-white transition-colors relative group">
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-cyan-400 transition-all group-hover:w-full" />
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => onNavigate?.('login')}
              className="text-sm font-semibold hover:text-cyan-400 transition-colors"
            >
              Sign In
            </button>
            <button 
              onClick={() => onNavigate?.('register')}
              className="btn-primary py-2.5 px-5 text-sm"
            >
              Start Coding Free
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-32 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <div className="animate-slide-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold mb-6 tracking-wider uppercase">
              <Sparkles className="w-3 h-3" />
              Now with GPT-4 Integration
            </div>
            <h1 className="text-7xl font-extrabold text-white mb-8 leading-[1.1] tracking-tight">
              The Cloud IDE <br />
              <span className="gradient-text-hero">For Modern Teams.</span>
            </h1>
            <p className="text-xl text-slate-400 mb-10 leading-relaxed max-w-xl">
              Code, build, and deploy from your browser with a powerful AI assistant, real-time collaboration, and instant infrastructure.
            </p>
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => onNavigate?.('register')}
                className="btn-primary py-4 px-8 text-base"
              >
                Get Started for Free
                <ArrowRight className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setShowDemo(true)}
                className="btn-secondary py-4 px-8 text-base bg-white/5"
              >
                Watch Demo
              </button>
            </div>
            
            {/* Download Links Section */}
            <div className="mt-8 flex flex-wrap gap-6 items-center">
              <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Available on:</span>
              <button onClick={() => handleDownload('Windows')} className="flex items-center gap-2 text-slate-400 hover:text-white transition group">
                <Shield className="w-4 h-4 group-hover:text-cyan-400" />
                <span className="text-sm font-medium">Windows</span>
              </button>
              <button onClick={() => handleDownload('macOS')} className="flex items-center gap-2 text-slate-400 hover:text-white transition group">
                <Cpu className="w-4 h-4 group-hover:text-purple-400" />
                <span className="text-sm font-medium">macOS</span>
              </button>
              <button onClick={() => handleDownload('Linux')} className="flex items-center gap-2 text-slate-400 hover:text-white transition group">
                <Terminal className="w-4 h-4 group-hover:text-green-400" />
                <span className="text-sm font-medium">Linux</span>
              </button>
            </div>
            <div className="mt-12 flex items-center gap-6">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-[#050810] bg-slate-800 overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="User" />
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-500">
                Joined by <span className="text-white font-bold">10,000+</span> developers this month
              </p>
            </div>
          </div>

          <div className="relative animate-fade-in delay-300">
            <div className="absolute inset-0 bg-cyan-500/20 blur-[100px] -z-10" />
            <div className="glass-card rounded-2xl overflow-hidden border-white/10 shadow-2xl">
              <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                </div>
                <div className="text-xs text-slate-500 font-mono">main.ts — CodeVerse</div>
              </div>
              <div className="p-8 bg-[#0a0e1a]/80">
                <AnimatedCode lines={codeLines} />
              </div>
            </div>
            
            {/* Floating badges */}
            <div className="absolute -top-6 -right-6 glass-card p-4 rounded-xl animate-float shadow-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Shield className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white uppercase tracking-wider">Status</div>
                  <div className="text-sm text-green-400">Deployed to Edge</div>
                </div>
              </div>
            </div>
            
            <div className="absolute -bottom-6 -left-6 glass-card p-4 rounded-xl animate-float delay-700 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <Cpu className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white uppercase tracking-wider">AI Assistant</div>
                  <div className="text-sm text-cyan-400">Generating code...</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20 animate-slide-up">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Everything you need to <br />
              <span className="text-cyan-400">build the future.</span>
            </h2>
            <p className="text-lg text-slate-400 leading-relaxed">
              CodeVerse brings professional tools to your browser, removing the friction between an idea and a deployed product.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div
                key={i}
                className="glass-card p-8 rounded-2xl group hover:border-cyan-500/50 transition-all duration-500"
              >
                <div className="mb-6 p-3 rounded-xl bg-white/5 w-fit group-hover:scale-110 group-hover:bg-cyan-500/10 transition-all duration-500">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-4 group-hover:text-cyan-400 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 px-6 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Simple, Transparent Pricing</h2>
            <p className="text-slate-400">Choose the plan that fits your ambition.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              { name: 'Starter', price: '$0', features: ['3 Projects', '1GB Storage', 'Community Support'] },
              { name: 'Pro', price: '$19', priceSub: '/mo', features: ['Unlimited Projects', '10GB Storage', 'AI Assistant', 'Priority Support'], popular: true },
              { name: 'Enterprise', price: 'Custom', features: ['Custom SSO', 'Unlimited Storage', 'Advanced Security', 'Dedicated Account Manager'] }
            ].map((plan, i) => (
              <div key={i} className={`glass-card p-10 rounded-3xl relative overflow-hidden ${plan.popular ? 'border-cyan-500/50 scale-105' : ''}`}>
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-cyan-500 text-[#050810] text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-tighter">
                    Most Popular
                  </div>
                )}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">{plan.price}</span>
                    <span className="text-slate-500 text-sm font-medium">{plan.priceSub}</span>
                  </div>
                </div>
                <ul className="space-y-4 mb-10">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm text-slate-400">
                      <div className="w-5 h-5 rounded-full bg-cyan-500/10 flex items-center justify-center">
                        <Zap className="w-3 h-3 text-cyan-400" />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={() => onNavigate?.(plan.name === 'Enterprise' ? 'login' : 'register')}
                  className={`w-full py-4 rounded-xl font-bold transition-all ${plan.popular ? 'bg-cyan-500 text-[#050810] hover:shadow-lg hover:shadow-cyan-500/30' : 'bg-white/5 hover:bg-white/10'}`}
                >
                  {plan.name === 'Enterprise' ? 'Contact Sales' : 'Get Started'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10 text-slate-500 text-sm">
          <div className="flex items-center gap-3">
            <Code2 className="w-6 h-6 text-cyan-400" />
            <span className="font-bold text-white">CodeVerse</span>
          </div>
          <div className="flex gap-10">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Security</a>
          </div>
          <p>© 2024 CodeVerse Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
