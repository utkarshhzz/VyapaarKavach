import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Shield, Zap, Lock, Brain, ChevronRight,
  CheckCircle2, Users, Database, Network, Eye, FileText, ArrowDown
} from "lucide-react";

const TOTAL_FRAMES = 100;
const FRAME_PAD = 3;
const frameSrc = (i: number) =>
  `/hero/gemini_generated_video_0d913559_${String(i).padStart(FRAME_PAD, "0")}.jpg`;

const STATS = [
  { label: "Merchants Protected", value: "18,400+", icon: Users },
  { label: "Double-Payouts Blocked", value: "Rs.2.3Cr", icon: Shield },
  { label: "ZK Proofs Generated", value: "4,820", icon: Lock },
  { label: "Disputes Resolved", value: "98.7%", icon: CheckCircle2 },
];

const FEATURES = [
  { Icon: Zap, title: "Deterministic State Machine", subtitle: "EXCEPTIONS_V1 Policy Engine", desc: "Every dispute follows an immutable ruleset. SUBMISSION_UNKNOWN states lock instantly, preventing double-refunds during network partitions.", glow: "#f59e0b", badge: "ACID Compliant" },
  { Icon: Brain, title: "Edge-Native NLP", subtitle: "ONNX SLM On-Device", desc: "Customer claims in Hindi, English or Hinglish parsed locally. Zero PII ever reaches the cloud. DPDP Act 2023 compliant by design.", glow: "#7c3aed", badge: "Privacy First" },
  { Icon: Lock, title: "ZK Fraud Syndication", subtitle: "Groth16 ZK-SNARKs", desc: "Share fraud intelligence across ONDC. Prove a fraud cluster without revealing identity, customer data or transaction volumes.", glow: "#10b981", badge: "Zero Knowledge" },
  { Icon: Database, title: "Transactional Outbox", subtitle: "No Double-Payout Guarantee", desc: "Refund mutations commit to an outbox in the same ACID transaction. Workers atomically lease jobs, one provider call guaranteed.", glow: "#06b6d4", badge: "ACID Safe" },
  { Icon: Network, title: "GATv2 Fraud Detection", subtitle: "Graph Attention Networks", desc: "Transaction subgraphs analyzed by our GATv2 model detect smurfing patterns and coordinated fraud rings across the merchant network.", glow: "#f43f5e", badge: "ML Advisory" },
  { Icon: Eye, title: "eBPF Worker Monitoring", subtitle: "Kernel-Level Security", desc: "eBPF probes attach to async refund workers and block any outbound connection not in the whitelisted payment provider list, at kernel level.", glow: "#6366f1", badge: "Kernel Security" },
];


const FLOW_STEPS = [
  { step: "01", title: "Claim Arrives", desc: "WhatsApp/SMS dispute text received by merchant", color: "#f59e0b" },
  { step: "02", title: "Edge NLP Parses", desc: "ONNX SLM extracts intent locally, no PII upload", color: "#7c3aed" },
  { step: "03", title: "Policy Evaluates", desc: "EXCEPTIONS_V1 engine applies deterministic rules", color: "#06b6d4" },
  { step: "04", title: "Outbox Commits", desc: "Refund intent locked in ACID transaction with job", color: "#10b981" },
  { step: "05", title: "Worker Executes", desc: "eBPF-monitored worker calls provider once only", color: "#14b8a6" },
  { step: "06", title: "ZK Proof Issued", desc: "Fraud pattern syndicated to ONDC without PII leak", color: "#f43f5e" },
];

const TECH_STACK = [
  { layer: "Frontend (Edge)", items: ["React + TypeScript + Vite", "PWA / Service Workers", "ONNX Runtime (WebAssembly)", "Vanilla CSS + Framer Motion"], border: "#7c3aed", glow: "rgba(124,58,237,0.12)" },
  { layer: "Backend (Core)", items: ["FastAPI + Pydantic", "PostgreSQL + SQLAlchemy", "PL/pgSQL Audit Triggers", "Transactional Outbox Workers"], border: "#06b6d4", glow: "rgba(6,182,212,0.12)" },
  { layer: "ML / Security", items: ["GATv2 (PyTorch Geometric)", "Groth16 ZK-SNARKs", "eBPF Network Probes", "SHA-256 Audit Hashing"], border: "#10b981", glow: "rgba(16,185,129,0.12)" },
];

function useInView(ref: React.RefObject<Element>, threshold = 0.25) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return inView;
}

function AnimatedCounter({ value, active }: { value: string; active: boolean }) {
  const [display, setDisplay] = useState("0");
  const ran = useRef(false);
  useEffect(() => {
    if (!active || ran.current) return;
    ran.current = true;
    const digits = parseFloat(value.replace(/[^0-9.]/g, ""));
    if (isNaN(digits)) { setDisplay(value); return; }
    const prefix = value.startsWith("Rs.") ? "Rs." : "";
    const suffix = value.match(/[+%Cr]+$/)?.[0] || "";
    let cur = 0;
    const step = digits / (1400 / 16);
    const timer = setInterval(() => {
      cur += step;
      if (cur >= digits) { setDisplay(value); clearInterval(timer); }
      else {
        const n = cur >= 1000 ? Math.floor(cur).toLocaleString("en-IN") : Math.floor(cur).toString();
        setDisplay(`${prefix}${n}${suffix}`);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [active, value]);
  return <span>{display}</span>;
}

// Preload all frames eagerly at module level so they're ready before mount
const PRELOADED: HTMLImageElement[] = [];
if (typeof window !== "undefined") {
  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const img = new Image();
    img.src = frameSrc(i);
    PRELOADED.push(img);
  }
}

function HeroCanvas({ scrollRatio }: { scrollRatio: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIdx = Math.min(Math.floor(scrollRatio * (TOTAL_FRAMES - 1)), TOTAL_FRAMES - 1);

  // Set canvas intrinsic size on mount and resize
  useEffect(() => {
    const setSize = () => {
      const c = canvasRef.current;
      if (!c) return;
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    };
    setSize();
    window.addEventListener("resize", setSize);
    return () => window.removeEventListener("resize", setSize);
  }, []);

  // Draw whenever frameIdx changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.width === 0) return;
    const img = PRELOADED[frameIdx];
    if (!img) return;
    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const scale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    };
    if (img.complete && img.naturalWidth) {
      draw();
    } else {
      img.onload = draw;
    }
  }, [frameIdx]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", objectFit: "cover" }}
    />
  );
}

function FeatureCard({ Icon, title, subtitle, desc, glow, badge }: {
  Icon: React.FC<{ size?: number; color?: string }>;
  title: string; subtitle: string; desc: string; glow: string; badge: string;
}) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, 0.15);
  return (
    <div ref={ref} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        padding: 28, borderRadius: 20, cursor: "default",
        border: `1px solid ${hovered ? glow + "55" : "rgba(255,255,255,0.06)"}`,
        background: hovered ? `${glow}12` : "rgba(255,255,255,0.02)",
        backdropFilter: "blur(8px)", transition: "all .35s",
        opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(24px)",
        boxShadow: hovered ? `0 0 40px ${glow}22` : "none",
      }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: `${glow}20`, border: `1px solid ${glow}44`,
          display: "flex", alignItems: "center", justifyContent: "center",
          transform: hovered ? "scale(1.1)" : "scale(1)", transition: "transform .3s",
          boxShadow: hovered ? `0 0 24px ${glow}55` : "none",
        }}>
          <Icon size={22} color={glow} />
        </div>
        <span style={{ fontSize: 10, fontFamily: "JetBrains Mono,monospace", padding: "3px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}>{badge}</span>
      </div>
      <h3 style={{ fontWeight: 700, fontSize: 17, margin: "0 0 4px", color: "#f1f5f9" }}>{title}</h3>
      <div style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 12, color: glow, marginBottom: 12 }}>{subtitle}</div>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.7, margin: 0 }}>{desc}</p>
    </div>
  );
}

function FlowStep({ step, title, desc, color, delay }: { step: string; title: string; desc: string; color: string; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, 0.2);
  return (
    <div ref={ref} style={{
      display: "flex", alignItems: "flex-start", gap: 24,
      opacity: inView ? 1 : 0, transform: inView ? "translateX(0)" : "translateX(-28px)",
      transition: `all .5s ease ${delay}ms`,
    }}>
      <div style={{
        flexShrink: 0, width: 64, height: 64, borderRadius: 18,
        background: color + "20", border: `1.5px solid ${color}55`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "Space Grotesk,sans-serif", fontWeight: 900, fontSize: 20, color,
        boxShadow: `0 0 24px ${color}33`,
      }}>{step}</div>
      <div style={{ paddingTop: 12 }}>
        <h3 style={{ fontWeight: 700, fontSize: 17, margin: "0 0 6px", color: "#f1f5f9" }}>{title}</h3>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, margin: 0 }}>{desc}</p>
      </div>
    </div>
  );
}

export default function VyapaarLanding() {
  const [scrollY, setScrollY] = useState(0);
  const statsRef = useRef<HTMLDivElement>(null);
  const heroWrapRef = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsRef as React.RefObject<Element>);

  useEffect(() => {
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // Calculate scroll ratio relative to hero wrapper position
  const heroWrapTop = heroWrapRef.current?.getBoundingClientRect().top ?? 0;
  const heroScrolled = scrollY - (heroWrapRef.current?.offsetTop ?? 0);
  const heroScrollableHeight = (heroWrapRef.current?.offsetHeight ?? window.innerHeight * 2.5) - window.innerHeight;
  const scrollRatio = Math.min(Math.max(heroScrolled / heroScrollableHeight, 0), 1);

  const vph = typeof window !== "undefined" ? window.innerHeight : 900;
  const heroOpacity = Math.max(1 - scrollY / (vph * 0.55), 0);
  const heroY = scrollY * 0.3;
  void heroWrapTop; // suppress unused warning

  return (
    <div style={{ background: "#040915", color: "#fff", fontFamily: "Inter,sans-serif", overflowX: "hidden" }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&family=Space+Grotesk:wght@700;900&family=JetBrains+Mono&family=Noto+Sans+Devanagari:wght@700&display=swap" rel="stylesheet" />

      {/* ====== STICKY HERO ====== */}
      <div ref={heroWrapRef} style={{ position: "relative", height: "250vh" }}>
        <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}>
          <HeroCanvas scrollRatio={scrollRatio} />
          {/* Vignette */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,rgba(4,9,21,.6) 0%,rgba(4,9,21,.1) 40%,rgba(4,9,21,.65) 80%,#040915 100%)", pointerEvents: "none" }} />
          {/* Grid */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "linear-gradient(rgba(6,182,212,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(6,182,212,.04) 1px,transparent 1px)", backgroundSize: "64px 64px" }} />

          {/* NAVBAR */}
          <nav style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 40px", background: "linear-gradient(to bottom,rgba(4,9,21,.85),transparent)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,#7c3aed,#5b21b6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(124,58,237,.5)" }}>
                <Shield size={20} color="#fff" />
              </div>
              <div>
                <div style={{ fontFamily: "Space Grotesk,sans-serif", fontWeight: 900, fontSize: 18, letterSpacing: -0.5 }}>Vyapaar Kavach</div>
                <div style={{ fontFamily: "Noto Sans Devanagari,sans-serif", fontSize: 11, color: "#a78bfa", letterSpacing: 2, marginTop: -2 }}>व्यापार कवच</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 32, fontSize: 14, color: "rgba(255,255,255,.65)" }}>
              {["features", "how-it-works", "technology"].map(id => (
                <a key={id} href={`#${id}`} style={{ textDecoration: "none", color: "inherit" }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "#fff")}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,.65)")}>
                  {id === "how-it-works" ? "How It Works" : id.charAt(0).toUpperCase() + id.slice(1)}
                </a>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <Link to="/vyapaar/dashboard" style={{ padding: "9px 20px", borderRadius: 10, border: "1px solid rgba(124,58,237,.5)", color: "#c4b5fd", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Live Demo</Link>
              <Link to="/vyapaar/dashboard" style={{ padding: "9px 20px", borderRadius: 10, background: "linear-gradient(135deg,#7c3aed,#5b21b6)", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", boxShadow: "0 0 20px rgba(124,58,237,.4)" }}>Dashboard</Link>
            </div>
          </nav>

          {/* HERO TEXT */}
          <div style={{ position: "absolute", bottom: "12%", left: 0, right: 0, textAlign: "center", padding: "0 24px", opacity: heroOpacity, transform: `translateY(${heroY}px)`, pointerEvents: heroOpacity < 0.1 ? "none" : "auto" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 18px", borderRadius: 999, border: "1px solid rgba(6,182,212,.4)", background: "rgba(6,182,212,.08)", fontSize: 12, fontFamily: "JetBrains Mono,monospace", color: "#67e8f9", marginBottom: 28, letterSpacing: 1 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#34d399", display: "inline-block" }} />
              ONDC-READY &nbsp;•&nbsp; DPDP 2023 &nbsp;•&nbsp; ZK-SNARK POWERED
            </div>
            <h1 style={{ fontFamily: "Space Grotesk,sans-serif", fontWeight: 900, fontSize: "clamp(40px,7vw,86px)", lineHeight: 1.05, margin: "0 0 20px", textShadow: "0 0 60px rgba(124,58,237,.4)" }}>
              <span style={{ color: "#fff" }}>Merchant-First</span><br />
              <span style={{ background: "linear-gradient(90deg,#a78bfa,#c084fc,#f0abfc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Exception Resolution</span><br />
              <span style={{ color: "#e2e8f0" }}>for Bharat</span>
            </h1>
            <p style={{ color: "rgba(255,255,255,.6)", fontSize: "clamp(15px,2vw,19px)", maxWidth: 660, margin: "0 auto 36px", lineHeight: 1.7 }}>
              Deterministic, privacy-preserving dispute resolution for small merchants in India's decentralized commerce ecosystem.{" "}
              <span style={{ color: "#c4b5fd" }}>Zero double-payouts. Zero PII leakage.</span>
            </p>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <Link to="/vyapaar/dashboard" id="hero-cta-dashboard" style={{ display: "flex", alignItems: "center", gap: 8, padding: "15px 32px", borderRadius: 14, background: "linear-gradient(135deg,#7c3aed,#5b21b6)", color: "#fff", fontWeight: 700, fontSize: 16, textDecoration: "none", boxShadow: "0 8px 32px rgba(124,58,237,.5)" }}>
                Launch Merchant Dashboard <ChevronRight size={18} />
              </Link>
              <Link to="/vyapaar/claim-parser" id="hero-cta-nlp" style={{ display: "flex", alignItems: "center", gap: 8, padding: "15px 32px", borderRadius: 14, border: "1.5px solid rgba(255,255,255,.15)", color: "rgba(255,255,255,.85)", fontWeight: 600, fontSize: 16, textDecoration: "none", backdropFilter: "blur(8px)", background: "rgba(255,255,255,.04)" }}>
                <Brain size={18} /> Try Edge NLP Parser
              </Link>
            </div>
            <div style={{ position: "absolute", bottom: -60, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: "rgba(255,255,255,.3)", fontSize: 11, fontFamily: "JetBrains Mono,monospace", animation: "bounceDown 2.5s ease-in-out infinite" }}>
              <span>scroll to explore</span><ArrowDown size={14} />
            </div>
          </div>
        </div>
      </div>

      {/* ====== STATS ====== */}
      <section ref={statsRef} style={{ padding: "80px 24px", background: "linear-gradient(to bottom,#040915,#080d1f)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 20 }}>
          {STATS.map(({ label, value, icon: Icon }) => (
            <div key={label} style={{ padding: "28px 24px", borderRadius: 20, textAlign: "center", border: "1px solid rgba(124,58,237,.2)", background: "rgba(124,58,237,.05)", backdropFilter: "blur(12px)", transition: "transform .3s,border-color .3s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,.5)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,.2)"; }}>
              <Icon size={22} color="#a78bfa" style={{ margin: "0 auto 10px" }} />
              <div style={{ fontFamily: "Space Grotesk,sans-serif", fontWeight: 900, fontSize: 32, color: "#fff" }}><AnimatedCounter value={value} active={statsInView} /></div>
              <div style={{ color: "rgba(255,255,255,.45)", fontSize: 13, marginTop: 6 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ====== FEATURES ====== */}
      <section id="features" style={{ padding: "100px 24px", background: "linear-gradient(to bottom,#080d1f,#050b1a)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <h2 style={{ fontFamily: "Space Grotesk,sans-serif", fontWeight: 900, fontSize: "clamp(32px,5vw,56px)", margin: "0 0 16px" }}>
              Built for <span style={{ background: "linear-gradient(90deg,#a78bfa,#f0abfc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Distributed Chaos</span>
            </h2>
            <p style={{ color: "rgba(255,255,255,.5)", fontSize: 18, maxWidth: 560, margin: "0 auto" }}>Every feature engineered to handle the hardest failure modes in India's payment ecosystem</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 24 }}>
            {FEATURES.map(f => <FeatureCard key={f.title} {...f} />)}
          </div>
        </div>
      </section>

      {/* ====== HOW IT WORKS ====== */}
      <section id="how-it-works" style={{ padding: "100px 24px", background: "linear-gradient(to bottom,#050b1a,#080d1f)" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <h2 style={{ fontFamily: "Space Grotesk,sans-serif", fontWeight: 900, fontSize: "clamp(32px,5vw,52px)", margin: "0 0 14px" }}>
              Dispute <span style={{ background: "linear-gradient(90deg,#34d399,#2dd4bf)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Resolution Flow</span>
            </h2>
            <p style={{ color: "rgba(255,255,255,.5)", fontSize: 17 }}>From messy WhatsApp message to verified refund, 6 deterministic steps</p>
          </div>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 31, top: 0, bottom: 0, width: 2, background: "linear-gradient(to bottom,#7c3aed55,#10b98155,transparent)" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              {FLOW_STEPS.map((s, i) => <FlowStep key={s.step} {...s} delay={i * 100} />)}
            </div>
          </div>
        </div>
      </section>

      {/* ====== TECH STACK ====== */}
      <section id="technology" style={{ padding: "100px 24px", background: "linear-gradient(to bottom,#080d1f,#040915)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <h2 style={{ fontFamily: "Space Grotesk,sans-serif", fontWeight: 900, fontSize: "clamp(32px,5vw,52px)", margin: "0 0 14px" }}>
              <span style={{ background: "linear-gradient(90deg,#60a5fa,#22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Technology</span> Stack
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 24 }}>
            {TECH_STACK.map(({ layer, items, border, glow }) => (
              <div key={layer} style={{ padding: "28px 28px 32px", borderRadius: 20, border: `1px solid ${border}44`, background: glow, backdropFilter: "blur(8px)", transition: "transform .3s,box-shadow .3s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}>
                <h3 style={{ fontWeight: 700, fontSize: 18, margin: "0 0 20px", paddingBottom: 16, borderBottom: `1px solid ${border}33`, color: "#e2e8f0" }}>{layer}</h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                  {items.map(item => (
                    <li key={item} style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(255,255,255,.75)", fontSize: 14 }}>
                      <CheckCircle2 size={16} color="#34d399" style={{ flexShrink: 0 }} />{item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== CTA ====== */}
      <section style={{ padding: "100px 24px", background: "#040915", textAlign: "center" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "60px 40px", borderRadius: 28, border: "1px solid rgba(124,58,237,.3)", background: "radial-gradient(ellipse at 50% 0%,rgba(124,58,237,.12),transparent 60%)", boxShadow: "0 0 80px rgba(124,58,237,.1)" }}>
          <div style={{ fontFamily: "JetBrains Mono,monospace", fontSize: 12, color: "#a78bfa", letterSpacing: 3, marginBottom: 20, textTransform: "uppercase" }}>Ready to explore?</div>
          <h2 style={{ fontFamily: "Space Grotesk,sans-serif", fontWeight: 900, fontSize: "clamp(28px,4vw,44px)", margin: "0 0 18px" }}>
            Protect your merchants <span style={{ background: "linear-gradient(90deg,#a78bfa,#f0abfc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>today</span>
          </h2>
          <p style={{ color: "rgba(255,255,255,.5)", fontSize: 17, marginBottom: 36, lineHeight: 1.7 }}>Launch the merchant dashboard to see all features in action with realistic demo data.</p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/vyapaar/dashboard" id="cta-launch-dashboard" style={{ padding: "15px 32px", borderRadius: 14, background: "linear-gradient(135deg,#7c3aed,#5b21b6)", color: "#fff", fontWeight: 700, fontSize: 16, textDecoration: "none", boxShadow: "0 8px 32px rgba(124,58,237,.45)" }}>Launch Dashboard</Link>
            <Link to="/cryptoflow/documentation" style={{ padding: "15px 32px", borderRadius: 14, border: "1.5px solid rgba(255,255,255,.12)", color: "rgba(255,255,255,.75)", fontWeight: 600, fontSize: 16, textDecoration: "none", backdropFilter: "blur(8px)" }}>
              <FileText size={16} style={{ display: "inline", marginRight: 8, verticalAlign: "middle" }} />Documentation
            </Link>
          </div>
        </div>
      </section>

      {/* ====== FOOTER ====== */}
      <footer style={{ padding: "32px 24px", borderTop: "1px solid rgba(255,255,255,.05)", textAlign: "center", color: "rgba(255,255,255,.3)", fontSize: 13, background: "#040915" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 8 }}>
          <Shield size={16} color="#7c3aed" />
          <span style={{ color: "rgba(255,255,255,.6)", fontWeight: 600 }}>Vyapaar Kavach</span>
          <span>•</span><span>Team SmurfPakad</span><span>•</span><span>India Hackathon 2026</span>
        </div>
        <p style={{ margin: 0 }}>GATv2 • ZK-SNARKs • ONNX Edge AI • eBPF Security</p>
      </footer>

      <style>{`
        @keyframes bounceDown {
          0%,100%{transform:translateX(-50%) translateY(0)}
          50%{transform:translateX(-50%) translateY(8px)}
        }
        *{box-sizing:border-box}
        html{scroll-behavior:smooth}
      `}</style>
    </div>
  );
}
