import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, useInView, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Code2, Zap, Users, Shield, Cpu, 
  Sparkles, Terminal, Globe, Lock, X, Play, 
  Github, Layers, MessageSquare, Download, Check
} from 'lucide-react';
import { PageType } from '../types';
import { Button } from '../components/Button';

interface LandingPageProps {
  onNavigate?: (page: PageType) => void;
}

// ============================================================
// ANIMATED CODE COMPONENT
// ============================================================

const AnimatedCode: React.FC = () => {
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

  return (
    <div className="font-mono text-sm space-y-1">
      {codeLines.map((line, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 + 0.5 }}
          className="flex gap-4 group"
        >
          <span className="text-slate-600 select-none w-4">{i + 1}</span>
          <span className={
            line.includes('const') || line.includes('return') || line.includes('await') || line.includes('async') 
            ? 'text-purple-400' 
            : line.includes('"') 
            ? 'text-green-400' 
            : 'text-blue-400'
          }>
            {line}
          </span>
        </motion.div>
      ))}
      <motion.div 
        animate={{ opacity: [0, 1, 0] }}
        transition={{ repeat: Infinity, duration: 1 }}
        className="w-2 h-5 bg-cyan-400 ml-8" 
      />
    </div>
  );
};

// ============================================================
// NAV ITEM COMPONENT
// ============================================================

const NavItem: React.FC<{ label: string; href: string; active: boolean }> = ({ label, href, active }) => (
  <a 
    href={href} 
    className={cn(
      "text-sm font-medium transition-colors relative group",
      active ? "text-white" : "text-slate-400 hover:text-white"
    )}
  >
    {label}
    <motion.span 
      initial={false}
      animate={{ width: active ? "100%" : "0%" }}
      className="absolute -bottom-1 left-0 h-0.5 bg-cyan-400" 
    />
    {!active && <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white/20 transition-all group-hover:w-full" />}
  </a>
);

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

// ============================================================
// MAIN LANDING PAGE
// ============================================================

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const [activeSection, setActiveSection] = useState('hero');
  const [showDemo, setShowDemo] = useState(false);
  const [logoAnimate, setLogoAnimate] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const { scrollYProgress } = useScroll();
  const scaleProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  // Handle Scroll Spy
  useEffect(() => {
    const handleScroll = () => {
      // Scroll spy
      const sections = ['hero', 'features', 'solutions', 'testimonials', 'pricing', 'docs'];
      const current = sections.find(section => {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          return rect.top <= 100 && rect.bottom >= 100;
        }
        return false;
      });
      if (current) setActiveSection(current);

      // Show scroll top button
      setShowScrollTop(window.scrollY > 500);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogoClick = () => {
    setLogoAnimate(true);
    setTimeout(() => setLogoAnimate(false), 1000);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#050810] text-slate-200">
      {/* Premium Navbar */}
      <nav className="fixed top-0 w-full z-[100] border-b border-white/5 bg-[#050810]/50 backdrop-blur-xl transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div 
            onClick={handleLogoClick}
            className="flex items-center gap-3 group cursor-pointer"
          >
            <motion.div 
              animate={logoAnimate ? { rotate: 360, scale: [1, 1.2, 1] } : {}}
              className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-400/40 transition-shadow"
            >
              <Code2 className="w-6 h-6 text-white" />
            </motion.div>
            <span className="text-2xl font-bold tracking-tight text-white">
              Code<span className="text-cyan-400">Verse</span>
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <NavItem label="Features" href="#features" active={activeSection === 'features'} />
            <NavItem label="Solutions" href="#solutions" active={activeSection === 'solutions'} />
            <NavItem label="Pricing" href="#pricing" active={activeSection === 'pricing'} />
            <NavItem label="Docs" href="#docs" active={activeSection === 'docs'} />
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => onNavigate?.('login')}
              className="text-sm font-semibold hover:text-cyan-400 transition-colors px-4 py-2"
            >
              Sign In
            </button>
            <Button 
              onClick={() => onNavigate?.('register')}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Start Coding Free
            </Button>
          </div>
        </div>
        {/* Progress Bar */}
        <motion.div 
          className="h-[2px] bg-cyan-400 origin-left"
          style={{ scaleX: scaleProgress }}
        />
      </nav>

      {/* Hero Section */}
      <section id="hero" className="relative pt-48 pb-32 px-6 overflow-hidden">
        {/* Background motion */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="bg-grid absolute inset-0 opacity-20" />
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.1, 0.2, 0.1]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="blob blob-cyan top-[-10%] left-[-10%] scale-150" 
          />
          <motion.div 
            animate={{ 
              scale: [1.1, 1, 1.1],
              opacity: [0.1, 0.2, 0.1]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="blob blob-purple bottom-[-10%] right-[-10%] scale-150" 
          />
        </div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold mb-6 tracking-wider uppercase"
            >
              <Sparkles className="w-3 h-3" />
              Now with GPT-4 Integration
            </motion.div>
            <h1 className="text-7xl font-extrabold text-white mb-8 leading-[1.1] tracking-tight">
              The Cloud IDE <br />
              <span className="gradient-text-hero">For Modern Teams.</span>
            </h1>
            <p className="text-xl text-slate-400 mb-10 leading-relaxed max-w-xl">
              Code, build, and deploy from your browser with a powerful AI assistant, real-time collaboration, and instant infrastructure.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button 
                onClick={() => onNavigate?.('register')}
                size="lg"
                rightIcon={<ArrowRight className="w-5 h-5" />}
              >
                Get Started for Free
              </Button>
              <Button 
                onClick={() => setShowDemo(true)}
                variant="secondary"
                size="lg"
                leftIcon={<Play className="w-5 h-5 fill-current" />}
              >
                Watch Demo
              </Button>
            </div>
            
            {/* Download Links */}
            <div className="mt-12 flex flex-wrap gap-8 items-center">
              <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Available on:</span>
              <div className="flex gap-6">
                <PlatformLink icon={<Shield />} label="Windows" color="group-hover:text-cyan-400" />
                <PlatformLink icon={<Cpu />} label="macOS" color="group-hover:text-purple-400" />
                <PlatformLink icon={<Terminal />} label="Linux" color="group-hover:text-green-400" />
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="relative group"
          >
            <div className="absolute inset-0 bg-cyan-500/20 blur-[120px] group-hover:bg-cyan-500/30 transition-colors duration-700" />
            <div className="glass-card rounded-2xl overflow-hidden border-white/10 shadow-2xl transform group-hover:scale-[1.02] transition-transform duration-500">
              <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                </div>
                <div className="text-xs text-slate-500 font-mono">main.ts — CodeVerse</div>
              </div>
              <div className="p-10 bg-[#0a0e1a]/80">
                <AnimatedCode />
              </div>
            </div>
            
            {/* Floating badges */}
            <FloatingBadge 
              icon={<Shield className="w-5 h-5 text-green-400" />}
              title="Status"
              value="Deployed to Edge"
              className="-top-8 -right-8"
              delay={0.5}
            />
            <FloatingBadge 
              icon={<Cpu className="w-5 h-5 text-cyan-400" />}
              title="AI Assistant"
              value="Generating code..."
              className="-bottom-8 -left-8"
              delay={0.8}
            />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 px-6 relative overflow-hidden bg-white/[0.01]">
        <div className="max-w-7xl mx-auto">
          <SectionHeader 
            title={<span>Everything you need to <br /><span className="text-cyan-400">build the future.</span></span>}
            description="CodeVerse brings professional tools to your browser, removing the friction between an idea and a deployed product."
          />

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Sparkles className="text-cyan-400" />}
              title="AI Code Generation"
              description="Generate production-ready code with our advanced AI assistant powered by state-of-the-art models."
            />
            <FeatureCard 
              icon={<Users className="text-blue-400" />}
              title="Live Collaboration"
              description="Code together in real-time with cursor positions, presence indicators, and shared terminals."
            />
            <FeatureCard 
              icon={<Terminal className="text-purple-400" />}
              title="Cloud Terminals"
              description="Fully interactive, isolated Linux terminals with root access and pre-installed toolchains."
            />
            <FeatureCard 
              icon={<Globe className="text-green-400" />}
              title="Instant Preview"
              description="See your changes instantly with hot-reloading and custom staging URLs for every branch."
            />
            <FeatureCard 
              icon={<Lock className="text-red-400" />}
              title="Secure Sandbox"
              description="Your code runs in isolated gVisor containers, ensuring maximum security and resource isolation."
            />
            <FeatureCard 
              icon={<Zap className="text-yellow-400" />}
              title="One-Click Deploy"
              description="Go from code to production in seconds with integrated CI/CD and multi-cloud support."
            />
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section id="solutions" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <SectionHeader 
            title="Built for every workflow."
            description="Whether you're a solo developer or a Fortune 500 team, CodeVerse scales with you."
          />
          
          <div className="grid lg:grid-cols-2 gap-12">
            <SolutionCard 
              title="For Individuals"
              description="The ultimate personal playground. Start projects in seconds, experiment with new stacks, and deploy to the cloud without touching a config file."
              features={['Unlimited public projects', 'AI Autocomplete', 'Discord support', 'Free hosting']}
              image="https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=1000"
            />
            <SolutionCard 
              title="For Teams"
              description="Collaboration at the speed of thought. Shared environments, role-based access control, and centralized billing for your entire engineering org."
              features={['Private workspaces', 'Team AI shared context', 'SSO & SAML', 'Priority support']}
              image="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1000"
              reverse
            />
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-32 px-6 relative overflow-hidden bg-white/[0.01]">
        <div className="max-w-7xl mx-auto">
          <SectionHeader 
            title="Trusted by the best."
            description="Join thousands of developers and teams who have switched to CodeVerse."
          />
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <TestimonialCard 
              quote="CodeVerse is the first cloud IDE that actually feels as fast as my local setup. The AI integration is a game-changer."
              author="Sarah Jenkins"
              role="Senior Architect at Vercel"
              avatar="https://i.pravatar.cc/100?img=32"
            />
            <TestimonialCard 
              quote="We migrated our entire engineering onboarding to CodeVerse. What used to take days now takes minutes."
              author="Marcus Chen"
              role="VP Engineering at Linear"
              avatar="https://i.pravatar.cc/100?img=12"
            />
            <TestimonialCard 
              quote="The collaborative features are unparalleled. Real-time terminal sharing works flawlessly every single time."
              author="Elena Rodriguez"
              role="CTO at Brex"
              avatar="https://i.pravatar.cc/100?img=45"
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 px-6 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto">
          <SectionHeader 
            title="Simple, Transparent Pricing"
            description="Choose the plan that fits your ambition."
          />

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <PricingCard 
              name="Starter"
              price="$0"
              features={['3 Projects', '1GB Storage', 'Community Support', 'Basic AI Assistant']}
              onAction={() => onNavigate?.('register')}
            />
            <PricingCard 
              name="Pro"
              price="$19"
              priceSub="/mo"
              features={['Unlimited Projects', '10GB Storage', 'GPT-4 AI Assistant', 'Priority Support', 'Custom Domains']}
              popular
              onAction={() => onNavigate?.('register')}
            />
            <PricingCard 
              name="Enterprise"
              price="Custom"
              features={['Custom SSO', 'Unlimited Storage', 'Advanced Security', 'Dedicated Account Manager', 'On-premise option']}
              onAction={() => onNavigate?.('login')}
            />
          </div>
        </div>
      </section>

      {/* Docs / CTA Section */}
      <section id="docs" className="py-32 px-6">
        <div className="max-w-5xl mx-auto text-center glass-card p-16 rounded-[3rem] relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10">
            <h2 className="text-5xl font-extrabold text-white mb-8">Ready to start building?</h2>
            <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto">
              Join thousands of developers who are already building the future on CodeVerse. Read our documentation to learn more about our features.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <Button size="lg" onClick={() => onNavigate?.('register')}>Get Started for Free</Button>
              <Button size="lg" variant="secondary" leftIcon={<MessageSquare />}>Read the Docs</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-white/5 bg-[#03050a]">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <Code2 className="w-8 h-8 text-cyan-400" />
                <span className="text-2xl font-bold text-white">CodeVerse</span>
              </div>
              <p className="text-slate-500 max-w-sm mb-8">
                The world's first AI-native cloud IDE designed for the modern era of software development.
              </p>
              <div className="flex gap-4">
                <SocialLink icon={<Github />} />
                <SocialLink icon={<Globe />} />
                <SocialLink icon={<Users />} />
              </div>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Product</h4>
              <ul className="space-y-4 text-sm text-slate-500">
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Changelog</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Documentation</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Company</h4>
              <ul className="space-y-4 text-sm text-slate-500">
                <li><a href="#" className="hover:text-cyan-400 transition-colors">About</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-12 border-t border-white/5 text-slate-600 text-sm">
            <p>© 2024 CodeVerse Inc. All rights reserved.</p>
            <p>Made with ❤️ for the developer community.</p>
          </div>
        </div>
      </footer>

      {/* Demo Modal */}
      {showDemo && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-fade-in">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative w-full max-w-5xl aspect-video glass-card rounded-3xl overflow-hidden border-cyan-500/30 shadow-[0_0_50px_rgba(0,242,255,0.2)]"
          >
            <button 
              onClick={() => setShowDemo(false)}
              className="absolute top-6 right-6 p-3 bg-black/50 hover:bg-black/80 rounded-full text-white transition z-10 border border-white/10"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/50">
              <Sparkles className="w-20 h-20 text-cyan-400 mb-6 animate-pulse" />
              <h3 className="text-4xl font-black text-white mb-4">CodeVerse Cinematic Demo</h3>
              <p className="text-slate-400 text-lg">The future of coding is being prepared... Get ready.</p>
              <Button className="mt-8" size="lg" onClick={() => setShowDemo(false)}>Close Preview</Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Scroll to Top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={handleLogoClick}
            className="fixed bottom-10 right-10 z-[100] w-12 h-12 bg-cyan-500 text-black rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/40 hover:bg-cyan-400 transition-colors"
          >
            <ArrowRight className="w-6 h-6 -rotate-90" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================
// HELPER COMPONENTS
// ============================================================

const PlatformLink = ({ icon, label, color }: any) => (
  <button className="flex items-center gap-2 text-slate-400 hover:text-white transition group">
    <div className={cn("transition-colors", color)}>{React.cloneElement(icon, { size: 16 })}</div>
    <span className="text-sm font-medium">{label}</span>
  </button>
);

const FloatingBadge = ({ icon, title, value, className, delay }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    className={cn("absolute glass-card p-4 rounded-xl animate-float shadow-2xl z-10", className)}
  >
    <div className="flex items-center gap-3">
      <div className="p-2 bg-white/5 rounded-lg">{icon}</div>
      <div>
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{title}</div>
        <div className="text-sm text-white font-semibold">{value}</div>
      </div>
    </div>
  </motion.div>
);

const SectionHeader = ({ title, description }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="text-center max-w-3xl mx-auto mb-20"
  >
    <h2 className="text-5xl font-bold text-white mb-6 leading-tight">{title}</h2>
    <p className="text-lg text-slate-400 leading-relaxed">{description}</p>
  </motion.div>
);

const FeatureCard = ({ icon, title, description }: any) => (
  <motion.div
    whileHover={{ y: -8, scale: 1.02 }}
    className="glass-card p-8 rounded-2xl group transition-all duration-500 relative overflow-hidden"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    <div className="relative z-10">
      <div className="mb-6 p-4 rounded-xl bg-white/5 w-fit group-hover:scale-110 group-hover:bg-white/10 transition-all duration-500">
        {React.cloneElement(icon, { size: 28 })}
      </div>
      <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-cyan-400 transition-colors">{title}</h3>
      <p className="text-slate-400 leading-relaxed text-sm">{description}</p>
    </div>
  </motion.div>
);

const SolutionCard = ({ title, description, features, image, reverse }: any) => (
  <motion.div 
    initial={{ opacity: 0, x: reverse ? 50 : -50 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true }}
    className={cn(
      "glass-card p-10 rounded-[2.5rem] flex flex-col lg:flex-row gap-12 items-center overflow-hidden",
      reverse && "lg:flex-row-reverse"
    )}
  >
    <div className="flex-1">
      <h3 className="text-3xl font-bold text-white mb-6">{title}</h3>
      <p className="text-slate-400 mb-8 leading-relaxed">{description}</p>
      <ul className="grid grid-cols-2 gap-4">
        {features.map((f: string) => (
          <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
            <Check className="w-4 h-4 text-cyan-400" />
            {f}
          </li>
        ))}
      </ul>
    </div>
    <div className="flex-1 w-full h-80 rounded-2xl overflow-hidden relative group">
      <img src={image} alt={title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#050810] to-transparent opacity-40" />
    </div>
  </motion.div>
);

const PricingCard = ({ name, price, priceSub, features, popular, onAction }: any) => (
  <motion.div 
    whileHover={{ y: -10 }}
    className={cn(
      "glass-card p-12 rounded-[2.5rem] relative overflow-hidden flex flex-col",
      popular ? "border-cyan-500/50 shadow-[0_0_40px_rgba(0,242,255,0.1)]" : ""
    )}
  >
    {popular && (
      <div className="absolute top-0 right-0 bg-cyan-500 text-black text-[10px] font-black px-4 py-1.5 rounded-bl-2xl uppercase tracking-tighter">
        Most Popular
      </div>
    )}
    <div className="mb-10">
      <h3 className="text-xl font-bold text-slate-400 mb-4 uppercase tracking-widest">{name}</h3>
      <div className="flex items-baseline gap-1">
        <span className="text-5xl font-black text-white">{price}</span>
        {priceSub && <span className="text-slate-500 text-lg">{priceSub}</span>}
      </div>
    </div>
    <ul className="space-y-5 mb-12 flex-1">
      {features.map((f: string) => (
        <li key={f} className="flex items-center gap-3 text-slate-400">
          <Check className="w-5 h-5 text-cyan-500 flex-shrink-0" />
          <span className="text-sm">{f}</span>
        </li>
      ))}
    </ul>
    <Button 
      onClick={onAction}
      className="w-full" 
      size="lg"
      variant={popular ? 'primary' : 'secondary'}
    >
      Get Started
    </Button>
  </motion.div>
);

const SocialLink = ({ icon }: any) => (
  <a href="#" className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all">
    {React.cloneElement(icon, { size: 18 })}
  </a>
);

const TestimonialCard = ({ quote, author, role, avatar }: any) => (
  <motion.div 
    whileHover={{ y: -10 }}
    className="glass-card p-8 rounded-3xl relative"
  >
    <div className="text-cyan-400 mb-6">
      <MessageSquare size={32} fill="currentColor" className="opacity-20" />
    </div>
    <p className="text-slate-300 mb-8 italic leading-relaxed font-medium">"{quote}"</p>
    <div className="flex items-center gap-4">
      <img src={avatar} alt={author} className="w-12 h-12 rounded-full border-2 border-cyan-500/30" />
      <div>
        <div className="text-white font-bold text-sm">{author}</div>
        <div className="text-slate-500 text-xs font-medium uppercase tracking-widest">{role}</div>
      </div>
    </div>
  </motion.div>
);

export default LandingPage;
