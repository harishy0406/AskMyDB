'use client';

import { useEffect, useRef } from 'react';
import { ArrowRight, Shield, Database, BarChart3, Eye, Upload, MessageSquare, Cpu, Table2 } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const ThreeScene = dynamic(() => import('@/components/ThreeScene'), { ssr: false });

function AnimatedSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('opacity-100', 'translate-y-0');
          entry.target.classList.remove('opacity-0', 'translate-y-8');
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`opacity-0 translate-y-8 transition-all duration-700 ease-out ${className}`}
    >
      {children}
    </div>
  );
}

function StepCard({ icon: Icon, step, title, desc }: { icon: any; step: string; title: string; desc: string }) {
  return (
    <div className="glass-card p-6 text-center group cursor-default">
      <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-600/20 border border-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
        <Icon size={28} className="text-blue-400" />
      </div>
      <div className="text-xs font-semibold text-blue-400 mb-1">{step}</div>
      <h3 className="text-lg font-semibold text-white mb-2 font-['Space_Grotesk']">{title}</h3>
      <p className="text-sm text-gray-400">{desc}</p>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="bg-grid absolute inset-0" />

        <div className="absolute inset-0">
          <ThreeScene />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <AnimatedSection>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 glass rounded-full text-sm text-blue-300">
              <Cpu size={14} />
              <span>AI-Powered Data Querying</span>
            </div>
          </AnimatedSection>

          <AnimatedSection>
            <h1 className="text-5xl md:text-7xl font-bold font-['Space_Grotesk'] mb-6 leading-tight">
              Chat with your data.
              <br />
              <span className="text-gradient">No SQL required.</span>
            </h1>
          </AnimatedSection>

          <AnimatedSection>
            <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
              Upload a CSV, Excel file, SQLite database, or connect Postgres/MySQL — then ask questions in plain English. Get instant answers with tables, charts, and plain-language summaries.
            </p>
          </AnimatedSection>

          <AnimatedSection>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link href="/app" className="btn-primary text-lg px-8 py-3.5 btn-glow inline-flex items-center gap-2">
                Get Started <ArrowRight size={20} />
              </Link>
              <a href="#how-it-works" className="btn-ghost text-lg px-8 py-3.5">
                See how it works
              </a>
            </div>
          </AnimatedSection>

          <AnimatedSection>
            <div className="mt-16 glass-card inline-block px-8 py-3">
              <div className="flex items-center gap-6 text-sm text-gray-400">
                <span className="flex items-center gap-1.5"><Database size={14} /> CSV / Excel</span>
                <span className="w-px h-4 bg-white/10" />
                <span className="flex items-center gap-1.5"><Database size={14} /> SQLite</span>
                <span className="w-px h-4 bg-white/10" />
                <span className="flex items-center gap-1.5"><Database size={14} /> Postgres</span>
                <span className="w-px h-4 bg-white/10" />
                <span className="flex items-center gap-1.5"><Database size={14} /> MySQL</span>
              </div>
            </div>
          </AnimatedSection>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-1.5">
            <div className="w-1.5 h-3 rounded-full bg-white/40" />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative py-24 px-6">
        <div className="blob blob-3" />
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold font-['Space_Grotesk'] mb-4">
              How it <span className="text-gradient">Works</span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Four simple steps from data to insights
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <AnimatedSection>
              <StepCard
                icon={Upload}
                step="Step 1"
                title="Upload or Connect"
                desc="Upload CSV, Excel, SQLite files or connect directly to Postgres/MySQL databases."
              />
            </AnimatedSection>
            <AnimatedSection>
              <StepCard
                icon={MessageSquare}
                step="Step 2"
                title="Ask in Plain English"
                desc="Type questions like 'Show me top 10 products by revenue' or 'What was the average score?'"
              />
            </AnimatedSection>
            <AnimatedSection>
              <StepCard
                icon={Cpu}
                step="Step 3"
                title="AI Generates SQL"
                desc="OpenRouter LLM converts your question into a safe, validated SELECT query — automatically."
              />
            </AnimatedSection>
            <AnimatedSection>
              <StepCard
                icon={BarChart3}
                step="Step 4"
                title="Results + Charts"
                desc="See results as tables, auto-generated charts, and plain-language summaries of the answer."
              />
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative py-24 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold font-['Space_Grotesk'] mb-4">
              Why <span className="text-gradient">TableTalk</span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Built for speed, safety, and simplicity
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Shield, title: "Safe by Design", desc: "All queries are SELECT-only. Validated by sqlglot parser before execution. Read-only database access." },
              { icon: Database, title: "Multi-Format", desc: "Upload CSV, Excel, or SQLite files. Connect Postgres or MySQL databases directly via connection string." },
              { icon: BarChart3, title: "Instant Viz", desc: "Numeric results auto-render as bar charts. Toggle between table and chart views seamlessly." },
              { icon: Eye, title: "Query Transparency", desc: "See exactly what SQL was generated. Learn from the queries. Full visibility into every step." },
            ].map((feat, i) => (
              <AnimatedSection key={i}>
                <div className="glass-card p-6 h-full">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-600/20 border border-blue-500/20 flex items-center justify-center mb-4">
                    <feat.icon size={24} className="text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2 font-['Space_Grotesk']">{feat.title}</h3>
                  <p className="text-sm text-gray-400">{feat.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <AnimatedSection>
            <h2 className="text-3xl md:text-5xl font-bold font-['Space_Grotesk'] mb-6">
              Ready to talk to your data?
            </h2>
            <p className="text-gray-400 mb-10 text-lg max-w-lg mx-auto">
              No sign-ups, no credit cards. Just upload a file and start asking questions.
            </p>
            <Link href="/app" className="btn-primary text-lg px-10 py-4 btn-glow inline-flex items-center gap-2">
              Get Started Now <ArrowRight size={20} />
            </Link>
          </AnimatedSection>
        </div>
      </section>

      <Footer />
    </div>
  );
}
