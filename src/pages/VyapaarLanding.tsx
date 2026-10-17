import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { 
  Shield, Zap, Lock, GitBranch, Brain, ChevronRight, 
  CheckCircle2, AlertTriangle, TrendingUp, Users,
  Database, Network, Eye, FileText
} from "lucide-react";

const STATS = [
  { label: "Merchants Protected", value: "18,400+", icon: Users },
  { label: "Double-Payouts Prevented", value: "₹2.3Cr", icon: Shield },
  { label: "ZK Proofs Generated", value: "4,820", icon: Lock },
  { label: "Disputes Resolved", value: "98.7%", icon: CheckCircle2 },
];

const FEATURES = [
  {
    icon: Zap,
    title: "Deterministic State Machine",
    subtitle: "EXCEPTIONS_V1 Policy Engine",
    desc: "Every dispute follows an immutable ruleset. SUBMISSION_UNKNOWN states lock instantly, preventing double-refunds during network partitions.",
    color: "from-amber-500 to-orange-500",
    badge: "ACID Compliant"
  },
  {
    icon: Brain,
    title: "Edge-Native NLP",
    subtitle: "ONNX SLM On-Device",
    desc: "Customer claims in Hindi, English or Hinglish are parsed locally on your device. Zero PII ever reaches the cloud — DPDP Act 2023 compliant.",
    color: "from-violet-500 to-purple-600",
    badge: "Privacy First"
  },
  {
    icon: Lock,
    title: "ZK Fraud Syndication",
    subtitle: "Groth16 ZK-SNARKs",
    desc: "Share fraud intelligence across the ONDC network. Mathematically prove a fraud cluster without revealing your identity, customer data or volumes.",
    color: "from-emerald-500 to-teal-600",
    badge: "Zero Knowledge"
  },
  {
    icon: Database,
    title: "Transactional Outbox",
    subtitle: "No Double-Payout Guarantee",
    desc: "Refund mutations commit to an outbox in the same ACID transaction. Workers atomically lease jobs — a single provider call is mathematically guaranteed.",
    color: "from-blue-500 to-cyan-600",
    badge: "ACID Safe"
  },
  {
    icon: Network,
    title: "GATv2 Fraud Detection",
    subtitle: "Graph Attention Networks",
    desc: "Transaction subgraphs are analyzed by our GATv2 model to detect smurfing patterns and coordinated fraud rings across the merchant network.",
    color: "from-rose-500 to-pink-600",
    badge: "ML Advisory"
  },
  {
    icon: Eye,
    title: "eBPF Worker Monitoring",
    subtitle: "Kernel-Level Security",
    desc: "eBPF probes attach to async refund workers and block any outbound connection not in the whitelisted payment provider list — at kernel level.",
    color: "from-indigo-500 to-blue-600",
    badge: "Kernel Security"
  },
];

const FLOW_STEPS = [
  { step: "01", title: "Claim Arrives", desc: "WhatsApp/SMS dispute text received by merchant", color: "bg-amber-500" },
  { step: "02", title: "Edge NLP Parses", desc: "ONNX SLM extracts intent locally — no PII upload", color: "bg-violet-500" },
  { step: "03", title: "Policy Evaluates", desc: "EXCEPTIONS_V1 engine applies deterministic rules", color: "bg-blue-500" },
  { step: "04", title: "Outbox Commits", desc: "Refund intent locked in ACID transaction with job", color: "bg-emerald-500" },
  { step: "05", title: "Worker Executes", desc: "eBPF-monitored worker calls provider once only", color: "bg-teal-500" },
  { step: "06", title: "ZK Proof Issued", desc: "Fraud pattern syndicated to ONDC without PII leak", color: "bg-rose-500" },
];

function AnimatedCounter({ value, duration = 1500 }: { value: string; duration?: number }) {
  const [display, setDisplay] = useState("0");
  const isNumeric = /^[\d,₹+%\.]+$/.test(value);

  useEffect(() => {
    if (!isNumeric) { setDisplay(value); return; }
    const end = parseFloat(value.replace(/[^0-9.]/g, ""));
    const prefix = value.match(/^[₹]/)?.[0] || "";
    const suffix = value.match(/[+%Cr]+$/)?.[0] || "";
    const start = 0;
    const step = (end - start) / (duration / 16);
    let current = start;
    const timer = setInterval(() => {
      current += step;
      if (current >= end) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        const formatted = current >= 1000 ? Math.floor(current).toLocaleString("en-IN") : Math.floor(current).toString();
        setDisplay(`${prefix}${formatted}${suffix}`);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  return <span>{display}</span>;
}

export default function VyapaarLanding() {
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#050510] text-white overflow-x-hidden">
      {/* Animated mesh gradient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d0a2e] via-[#050510] to-[#0a1628]" />
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full opacity-20"
          style={{
            background: "radial-gradient(ellipse, #6d28d9 0%, transparent 70%)",
            transform: `translate(-50%, ${scrollY * 0.2}px)`,
          }}
        />
        <div className="absolute bottom-0 right-0 w-[600px] h-[500px] rounded-full opacity-10"
          style={{ background: "radial-gradient(ellipse, #0ea5e9 0%, transparent 70%)" }} />
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(#6d28d9 1px,transparent 1px),linear-gradient(90deg,#6d28d9 1px,transparent 1px)", backgroundSize: "60px 60px" }} />
      </div>

      {/* Navbar */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-xl text-white">Vyapaar Kavach</span>
            <div className="text-[10px] text-violet-400 font-mono tracking-widest uppercase -mt-0.5">व्यापार कवच</div>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm text-gray-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
          <a href="#technology" className="hover:text-white transition-colors">Technology</a>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/vyapaar/dashboard"
            className="px-4 py-2 rounded-lg border border-violet-500/40 text-violet-300 text-sm hover:border-violet-400 hover:text-white transition-all">
            Demo Dashboard
          </Link>
          <Link to="/cryptoflow"
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-medium hover:from-violet-500 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/20">
            SmurfPakad →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section ref={heroRef} className="relative z-10 pt-20 pb-32 px-6 text-center max-w-6xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-sm font-mono mb-8">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          ONDC-Ready • DPDP 2023 Compliant • ZK-SNARK Powered
        </div>

        <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
          <span className="text-white">Merchant-First</span>
          <br />
          <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
            Exception Resolution
          </span>
          <br />
          <span className="text-white">for Bharat</span>
        </h1>

        <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed">
          Deterministic, privacy-preserving dispute resolution for small merchants in India's decentralized commerce ecosystem.
          <span className="text-violet-300"> Zero double-payouts. Zero PII leakage. Zero trust fraud networks.</span>
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
          <Link to="/vyapaar/dashboard"
            id="hero-cta-dashboard"
            className="group flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold text-lg hover:from-violet-500 hover:to-purple-500 transition-all shadow-2xl shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-[1.02]">
            Launch Merchant Dashboard
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link to="/vyapaar/claim-parser"
            id="hero-cta-nlp"
            className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-gray-700 text-gray-300 font-semibold text-lg hover:border-violet-500/50 hover:text-white transition-all">
            <Brain className="w-5 h-5" />
            Try Edge NLP Parser
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {STATS.map(({ label, value, icon: Icon }) => (
            <div key={label} className="p-5 rounded-2xl border border-white/5 bg-white/3 backdrop-blur-sm hover:border-violet-500/20 transition-all group">
              <Icon className="w-5 h-5 text-violet-400 mb-2 mx-auto group-hover:scale-110 transition-transform" />
              <div className="text-2xl font-black text-white">
                <AnimatedCounter value={value} />
              </div>
              <div className="text-xs text-gray-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Built for <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Distributed Chaos</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Every feature engineered to handle the hardest failure modes in India's payment ecosystem
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, subtitle, desc, color, badge }) => (
            <div key={title}
              className="group relative p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04] transition-all duration-300 cursor-default">
              <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br ${color} pointer-events-none`}
                style={{ opacity: 0, transition: "opacity 0.3s" }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.03")}
              />
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-start justify-between mb-1">
                <h3 className="font-bold text-white text-lg">{title}</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-white/10 text-gray-400 whitespace-nowrap ml-2">{badge}</span>
              </div>
              <div className="text-violet-400 text-sm font-mono mb-3">{subtitle}</div>
              <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative z-10 py-24 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Dispute <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Resolution Flow</span>
          </h2>
          <p className="text-gray-400 text-lg">From messy WhatsApp message to verified refund — 6 deterministic steps</p>
        </div>

        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-violet-500/50 via-emerald-500/50 to-transparent hidden md:block" />
          <div className="space-y-6">
            {FLOW_STEPS.map(({ step, title, desc, color }) => (
              <div key={step} className="flex items-start gap-6 group">
                <div className={`relative flex-shrink-0 w-16 h-16 rounded-2xl ${color} flex items-center justify-center font-black text-white text-lg shadow-lg group-hover:scale-110 transition-transform`}>
                  {step}
                  <div className={`absolute inset-0 rounded-2xl ${color} opacity-30 blur-lg -z-10`} />
                </div>
                <div className="flex-1 pt-3">
                  <h3 className="font-bold text-white text-lg mb-1">{title}</h3>
                  <p className="text-gray-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section id="technology" className="relative z-10 py-24 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-black text-white mb-4">
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Technology</span> Stack
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              layer: "Frontend (Edge)",
              items: ["React + TypeScript + Vite", "PWA / Service Workers", "ONNX Runtime (WebAssembly)", "Tailwind CSS + Framer Motion"],
              color: "border-violet-500/30 bg-violet-500/5"
            },
            {
              layer: "Backend (Core)",
              items: ["FastAPI + Pydantic", "PostgreSQL + SQLAlchemy", "PL/pgSQL Audit Triggers", "Transactional Outbox Workers"],
              color: "border-blue-500/30 bg-blue-500/5"
            },
            {
              layer: "ML / Security",
              items: ["GATv2 (PyTorch Geometric)", "Groth16 ZK-SNARKs", "eBPF Network Probes", "SHA-256 Audit Hashing"],
              color: "border-emerald-500/30 bg-emerald-500/5"
            }
          ].map(({ layer, items, color }) => (
            <div key={layer} className={`p-6 rounded-2xl border ${color}`}>
              <h3 className="font-bold text-white text-lg mb-4 pb-3 border-b border-white/10">{layer}</h3>
              <ul className="space-y-2">
                {items.map(item => (
                  <li key={item} className="flex items-center gap-2 text-gray-300 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-24 px-6 text-center">
        <div className="max-w-3xl mx-auto p-12 rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-900/20 to-purple-900/10">
          <h2 className="text-4xl font-black text-white mb-4">Ready to explore?</h2>
          <p className="text-gray-400 mb-8">Launch the merchant dashboard to see all features in action with realistic demo data.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/vyapaar/dashboard"
              id="cta-launch-dashboard"
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold hover:from-violet-500 hover:to-purple-500 transition-all shadow-xl shadow-violet-500/30">
              Launch Dashboard →
            </Link>
            <Link to="/cryptoflow/documentation"
              className="px-8 py-4 rounded-xl border border-white/10 text-gray-300 font-bold hover:border-white/20 hover:text-white transition-all">
              <FileText className="inline w-4 h-4 mr-2" />
              Documentation
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-6 border-t border-white/5 text-center text-gray-600 text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-violet-500" />
          <span className="text-gray-400 font-semibold">Vyapaar Kavach</span>
          <span>•</span>
          <span>Team SmurfPakad</span>
          <span>•</span>
          <span>India Hackathon 2026</span>
        </div>
        <p>Powered by GATv2 • ZK-SNARKs • ONNX Edge AI • eBPF Security</p>
      </footer>
    </div>
  );
}
