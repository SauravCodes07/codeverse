import React, { useState, useEffect } from 'react';
import { ArrowRight, Code2, Zap, Users, Cloud, Shield, Cpu, Sparkles } from 'lucide-react';

interface AnimatedCodeProps {
  lines: string[];
}

const AnimatedCode: React.FC<AnimatedCodeProps> = ({ lines }) => {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);

  useEffect(() => {
    let currentLine = 0;
    const interval = setInterval(() => {
      if (currentLine < lines.length) {
        setDisplayedLines(prev => [...prev, lines[currentLine]]);
        currentLine++;
      } else {
        clearInterval(interval);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [lines]);

  return (
    <div className="font-mono text-sm text-green-400 space-y-1 overflow-hidden">
      {displayedLines.map((line, i) => (
        <div key={i} className="animate-pulse">
          {line}
        </div>
      ))}
    </div>
  );
};

export const LandingPage: React.FC = () => {
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

  const features = [
    {
      icon: <Sparkles className="w-8 h-8" />,
      title: 'AI Code Generation',
      description: 'Generate production-ready code with our advanced AI assistant',
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Live Collaboration',
      description: 'Code together in real-time with cursor positions and awareness',
    },
    {
      icon: <Cpu className="w-8 h-8" />,
      title: 'Multi-Language Compiler',
      description: 'Execute JavaScript, Python, Java, C++, Go, Rust, and more',
    },
    {
      icon: <Cloud className="w-8 h-8" />,
      title: 'Instant Deployments',
      description: 'Deploy your projects with one click to production',
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: 'Containerized Runtime',
      description: 'Secure, isolated execution environment with resource limits',
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: 'Team Workspace',
      description: 'Manage projects, teams, and permissions effortlessly',
    },
  ];

  const testimonials = [
    {
      quote: 'CodeVerse transformed how our team codes. The AI assistance is incredible.',
      author: 'Sarah Chen',
      role: 'CTO, TechStartup',
    },
    {
      quote: 'The collaboration features are seamless. Best cloud IDE experience.',
      author: 'Marcus Johnson',
      role: 'Lead Developer, CloudCorp',
    },
    {
      quote: 'Production-ready code in minutes. This is the future of development.',
      author: 'Emily Rodriguez',
      role: 'Founder, DevStudio',
    },
  ];

  const pricingPlans = [
    {
      name: 'Starter',
      price: '$0',
      description: 'Perfect for learning',
      features: ['Basic IDE', '5 projects', 'Community support', '1GB storage'],
      cta: 'Get Started Free',
    },
    {
      name: 'Professional',
      price: '$29',
      period: '/month',
      description: 'For serious developers',
      features: ['Advanced IDE', 'Unlimited projects', 'AI assistant', '100GB storage', 'Team collaboration'],
      cta: 'Start Free Trial',
      highlighted: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      description: 'For organizations',
      features: ['Everything in Pro', 'Admin controls', 'SSO & security', 'Dedicated support', 'Custom integration'],
      cta: 'Contact Sales',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-md bg-slate-950/50 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Code2 className="w-8 h-8 text-cyan-400" />
            <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              CodeVerse
            </span>
          </div>
          <div className="hidden md:flex gap-8">
            <a href="#features" className="text-slate-300 hover:text-white transition">Features</a>
            <a href="#pricing" className="text-slate-300 hover:text-white transition">Pricing</a>
            <a href="#" className="text-slate-300 hover:text-white transition">Docs</a>
          </div>
          <div className="flex gap-4">
            <button className="px-6 py-2 text-white border border-slate-700 rounded-lg hover:border-cyan-500 transition">
              Sign In
            </button>
            <button className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition">
              Start Coding
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-6">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        </div>

        <div className="relative max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                Code Anywhere
              </span>
              <span className="block text-white">With AI Power</span>
            </h1>
            <p className="text-xl text-slate-300 mb-8 leading-relaxed">
              The next-generation cloud IDE with AI-powered code generation, real-time collaboration, and instant deployments.
            </p>
            <div className="flex gap-4">
              <button className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition flex items-center gap-2">
                Start Coding Free
                <ArrowRight className="w-5 h-5" />
              </button>
              <button className="px-8 py-3 border-2 border-slate-600 text-white rounded-lg font-semibold hover:border-cyan-500 transition">
                Watch Demo
              </button>
            </div>
            <p className="text-sm text-slate-400 mt-6">
              ✨ No credit card required • Free tier available
            </p>
          </div>

          {/* Code editor preview */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 overflow-hidden shadow-2xl">
            <div className="flex gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <AnimatedCode lines={codeLines} />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-5xl font-bold text-center mb-12">
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Powerful Features
            </span>
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div
                key={i}
                className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6 hover:border-cyan-500 transition group"
              >
                <div className="mb-4 p-3 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-lg w-fit group-hover:shadow-lg group-hover:shadow-cyan-500/50 transition">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">{feature.title}</h3>
                <p className="text-slate-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-24 px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-5xl font-bold text-center mb-12">
            See It In Action
          </h2>
          <div className="aspect-video bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
            <video className="w-full h-full object-cover" controls poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1280 720'%3E%3Crect fill='%23334155' width='1280' height='720'/%3E%3C/svg%3E">
              <source src="#" type="video/mp4" />
              Your browser doesn't support video playback.
            </video>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-5xl font-bold text-center mb-12">
            Loved by Developers
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, i) => (
              <div key={i} className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-8">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <span key={j} className="text-yellow-400">★</span>
                  ))}
                </div>
                <p className="text-slate-300 mb-4 italic">"{testimonial.quote}"</p>
                <p className="font-semibold text-white">{testimonial.author}</p>
                <p className="text-sm text-slate-400">{testimonial.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-5xl font-bold text-center mb-12">
            Simple, Transparent Pricing
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, i) => (
              <div
                key={i}
                className={`rounded-2xl border transition ${
                  plan.highlighted
                    ? 'bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border-cyan-500 shadow-xl shadow-cyan-500/20 scale-105'
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                } p-8`}
              >
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="mb-2">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  {plan.period && <span className="text-slate-400">{plan.period}</span>}
                </div>
                <p className="text-slate-400 mb-6">{plan.description}</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-2 text-slate-300">
                      <span className="text-cyan-400">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  className={`w-full py-3 rounded-lg font-semibold transition ${
                    plan.highlighted
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg hover:shadow-cyan-500/50'
                      : 'border border-slate-600 text-white hover:border-cyan-500'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 border-t border-slate-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold mb-6">
            Ready to Code Like Never Before?
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            Join thousands of developers using CodeVerse to build amazing things.
          </p>
          <button className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition flex items-center gap-2 mx-auto">
            Start Coding Free
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-800 text-slate-400">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-5 gap-8 mb-12">
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">Features</a></li>
                <li><a href="#" className="hover:text-white transition">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition">Documentation</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Status</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">Community</a></li>
                <li><a href="#" className="hover:text-white transition">FAQ</a></li>
                <li><a href="#" className="hover:text-white transition">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms</a></li>
                <li><a href="#" className="hover:text-white transition">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Follow</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">Twitter</a></li>
                <li><a href="#" className="hover:text-white transition">GitHub</a></li>
                <li><a href="#" className="hover:text-white transition">Discord</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex justify-between items-center">
            <p>&copy; 2024 CodeVerse. All rights reserved.</p>
            <p>Crafted with passion by the CodeVerse team</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
