import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, FileText, Settings, Shield, Lock, Brain,
  Database, Network, ShieldCheck, GitMerge, BarChart3, Menu, X,
  ChevronRight, Sun, Moon, Bell, Zap
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface VyapaarLayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { name: "Dashboard", href: "/vyapaar/dashboard", icon: LayoutDashboard, desc: "Overview & stats" },
  { name: "Dispute Resolution", href: "/vyapaar/disputes", icon: ShieldCheck, desc: "State machine" },
  { name: "Claim Parser", href: "/vyapaar/claim-parser", icon: Brain, desc: "Edge NLP" },
  { name: "Outbox Monitor", href: "/vyapaar/outbox", icon: Database, desc: "Worker status" },
  { name: "ZK Fraud Sync", href: "/vyapaar/zk-fraud", icon: Lock, desc: "Privacy syndication" },
  { name: "GATv2 Graph ML", href: "/vyapaar/graph-ml", icon: Network, desc: "Fraud detection" },
  { name: "Audit Export", href: "/vyapaar/audit", icon: FileText, desc: "Cryptographic audit" },
  { name: "AI Governance", href: "/vyapaar/governance", icon: GitMerge, desc: "ML fairness & drift" },
  { name: "SmurfPakad →", href: "/cryptoflow", icon: BarChart3, desc: "Crypto fraud detection" },
];

const STATUS_BADGES = [
  { label: "Outbox", status: "ACTIVE", color: "bg-emerald-400" },
  { label: "eBPF", status: "MONITORING", color: "bg-blue-400" },
  { label: "ONDC", status: "SYNCED", color: "bg-violet-400" },
];

export function VyapaarLayout({ children }: VyapaarLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState<"checking" | "live" | "demo">("checking");
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
    fetch(`${API}/api/v1/health`, { signal: AbortSignal.timeout(2500) })
      .then(r => r.ok ? setApiStatus("live") : setApiStatus("demo"))
      .catch(() => setApiStatus("demo"));
  }, []);

  const apiConfig = {
    checking: { dot: "bg-gray-400 animate-pulse", text: "text-gray-400", label: "Connecting…" },
    live: { dot: "bg-emerald-400", text: "text-emerald-400", label: "API Connected" },
    demo: { dot: "bg-amber-400 animate-pulse", text: "text-amber-400", label: "Demo Mode" },
  }[apiStatus];

  return (
    <div className="min-h-screen bg-[#07060f] text-white flex">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/70 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 flex flex-col
        bg-gradient-to-b from-[#0d0b1e] to-[#07060f]
        border-r border-violet-900/30
        transition-transform duration-300 lg:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between p-5 border-b border-violet-900/30">
          <Link to="/vyapaar" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-white text-sm">Vyapaar Kavach</div>
              <div className="text-[9px] text-violet-400 font-mono tracking-widest">व्यापार कवच</div>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* API Status */}
        <div className="mx-4 mt-4 p-3 rounded-xl border border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${apiConfig.dot}`} />
            <span className={`text-xs font-mono ${apiConfig.text}`}>{apiConfig.label}</span>
          </div>
          <div className="flex gap-2 mt-2">
            {STATUS_BADGES.map(({ label, status, color }) => (
              <div key={label} className="flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
                <span className="text-[9px] text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ name, href, icon: Icon, desc }) => {
            const active = location.pathname === href;
            return (
              <Link key={href} to={href}
                onClick={() => setSidebarOpen(false)}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  active
                    ? "bg-violet-600/20 border border-violet-500/30 text-white"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}>
                <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-violet-400" : "group-hover:text-violet-400 transition-colors"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{name}</div>
                  <div className="text-[10px] text-gray-600 truncate">{desc}</div>
                </div>
                {active && <ChevronRight className="w-3 h-3 text-violet-400 flex-shrink-0" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-4 border-t border-violet-900/20">
          <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-amber-400 font-mono">EXCEPTIONS_V1</span>
            </div>
            <div className="text-[10px] text-gray-500">Policy engine active • All states deterministic</div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#07060f]/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-400 hover:text-white">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm font-semibold text-white">{
                NAV_ITEMS.find(n => n.href === location.pathname)?.name || "Vyapaar Kavach"
              }</h1>
              <p className="text-xs text-gray-500">{
                NAV_ITEMS.find(n => n.href === location.pathname)?.desc || "Merchant Exception Platform"
              }</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all relative">
              <Bell className="w-4 h-4" />
              <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full" />
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-xs font-bold">
              M
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
