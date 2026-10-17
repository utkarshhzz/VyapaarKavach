import { useState, useEffect } from "react";
import { VyapaarLayout } from "@/components/VyapaarLayout";
import { Link } from "react-router-dom";
import {
  Shield, AlertTriangle, Clock, CheckCircle2, TrendingUp,
  Database, Lock, Brain, Zap, ChevronRight, RefreshCw,
  XCircle, Activity
} from "lucide-react";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const TENANT = "demo-merchant-1";

interface DashboardStats {
  total_transactions: number;
  disputed_count: number;
  pending_refunds: number;
  total_refunded_paise: number;
  conflicted_intents: number;
  zk_proofs_generated: number;
  risk_score: number;
}

interface Payment {
  id: string;
  transaction_ref: string;
  amount_paise: number;
  payment_status: string;
  verification_state: string;
  provider: string;
  customer_name: string;
  created_at: string;
}

interface RefundIntent {
  id: string;
  payment_id: string;
  amount_paise: number;
  status: string;
  policy_verdict: string;
  transaction_ref: string;
  created_at: string;
}

const DEMO_STATS: DashboardStats = {
  total_transactions: 7,
  disputed_count: 2,
  pending_refunds: 2,
  total_refunded_paise: 45000,
  conflicted_intents: 1,
  zk_proofs_generated: 1,
  risk_score: 42.86
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  SUCCESS: { color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20", label: "Success" },
  PENDING: { color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20", label: "Pending" },
  DISPUTED: { color: "text-rose-400", bg: "bg-rose-400/10 border-rose-400/20", label: "Disputed" },
  FAILED: { color: "text-gray-400", bg: "bg-gray-400/10 border-gray-400/20", label: "Failed" },
  REFUNDED: { color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20", label: "Refunded" },
  COMPLETED: { color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20", label: "Completed" },
  SUBMISSION_UNKNOWN: { color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20", label: "Timeout Lock" },
  CONFLICTED: { color: "text-rose-400", bg: "bg-rose-400/10 border-rose-400/20", label: "Conflicted" },
  APPROVED: { color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20", label: "Approved" },
  DRAFT: { color: "text-gray-400", bg: "bg-gray-400/10 border-gray-400/20", label: "Draft" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { color: "text-gray-400", bg: "bg-gray-400/10 border-gray-400/20", label: status };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono border ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, color, href }:
  { icon: any; label: string; value: string | number; sub?: string; color: string; href?: string }) {
  const card = (
    <div className={`group p-5 rounded-2xl border border-white/5 bg-white/[0.02] hover:border-${color}-500/20 hover:bg-white/[0.04] transition-all cursor-default`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl bg-${color}-500/10 border border-${color}-500/20 flex items-center justify-center`}>
          <Icon className={`w-5 h-5 text-${color}-400`} />
        </div>
        {href && <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />}
      </div>
      <div className="text-2xl font-black text-white mb-1">{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
      {sub && <div className="text-xs text-gray-600 mt-1">{sub}</div>}
    </div>
  );
  return href ? <Link to={href}>{card}</Link> : card;
}

export default function MerchantDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [refunds, setRefunds] = useState<RefundIntent[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, paymentsRes, refundsRes] = await Promise.all([
        fetch(`${API}/api/v1/vyapaar/disputes/dashboard?tenant_id=${TENANT}`).catch(() => null),
        fetch(`${API}/api/v1/vyapaar/disputes/payments?tenant_id=${TENANT}`).catch(() => null),
        fetch(`${API}/api/v1/vyapaar/disputes/refunds?tenant_id=${TENANT}`).catch(() => null),
      ]);

      if (statsRes?.ok) {
        const d = await statsRes.json();
        setStats(d.stats);
      } else {
        setStats(DEMO_STATS);
      }

      if (paymentsRes?.ok) {
        const d = await paymentsRes.json();
        setPayments(d.payments || []);
      } else {
        setPayments([
          { id: "pay-001", transaction_ref: "TXN2024001", amount_paise: 85000, payment_status: "SUCCESS", verification_state: "VERIFIED", provider: "RAZORPAY", customer_name: "Ravi Kumar", created_at: "2024-10-15T10:00:00" },
          { id: "pay-002", transaction_ref: "TXN2024002", amount_paise: 32500, payment_status: "PENDING", verification_state: "SUBMISSION_UNKNOWN", provider: "PAYTM", customer_name: "Priya Sharma", created_at: "2024-10-16T14:30:00" },
          { id: "pay-003", transaction_ref: "TXN2024003", amount_paise: 120000, payment_status: "DISPUTED", verification_state: "CONFLICTED", provider: "PHONEPE", customer_name: "Amit Singh", created_at: "2024-10-17T09:15:00" },
          { id: "pay-004", transaction_ref: "TXN2024004", amount_paise: 45000, payment_status: "SUCCESS", verification_state: "VERIFIED", provider: "RAZORPAY", customer_name: "Sunita Devi", created_at: "2024-10-14T11:00:00" },
          { id: "pay-005", transaction_ref: "TXN2024005", amount_paise: 67000, payment_status: "FAILED", verification_state: "UNVERIFIED", provider: "PAYTM", customer_name: "Rajesh Gupta", created_at: "2024-10-13T16:45:00" },
        ]);
      }

      if (refundsRes?.ok) {
        const d = await refundsRes.json();
        setRefunds(d.refund_intents || []);
      } else {
        setRefunds([
          { id: "ref-001", payment_id: "pay-002", amount_paise: 32500, status: "SUBMISSION_UNKNOWN", policy_verdict: "EXCEPTIONS_V1_TIMEOUT_LOCK", transaction_ref: "TXN2024002", created_at: "2024-10-16T15:00:00" },
          { id: "ref-002", payment_id: "pay-003", amount_paise: 120000, status: "CONFLICTED", policy_verdict: "EXCEPTIONS_V1_CONFLICTED", transaction_ref: "TXN2024003", created_at: "2024-10-17T10:00:00" },
          { id: "ref-003", payment_id: "pay-004", amount_paise: 45000, status: "COMPLETED", policy_verdict: "EXCEPTIONS_V1_APPROVED", transaction_ref: "TXN2024004", created_at: "2024-10-14T12:00:00" },
        ]);
      }
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  };

  useEffect(() => { fetchData(); }, []);

  const s = stats || DEMO_STATS;

  return (
    <VyapaarLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">Merchant Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">
              Sharma Kirana Store • GSTIN: 27AAPFU0939F1ZV •
              <span className="text-gray-600 ml-1">Last updated: {lastRefresh.toLocaleTimeString()}</span>
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all text-sm disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Activity} label="Total Transactions" value={s.total_transactions}
            sub="This period" color="violet" href="/vyapaar/disputes" />
          <StatCard icon={AlertTriangle} label="Active Disputes" value={s.disputed_count}
            sub={`${s.conflicted_intents} conflicted`} color="rose" href="/vyapaar/disputes" />
          <StatCard icon={Clock} label="Pending Refunds" value={s.pending_refunds}
            sub="Awaiting processing" color="amber" href="/vyapaar/outbox" />
          <StatCard icon={CheckCircle2} label="Amount Refunded"
            value={`₹${(s.total_refunded_paise / 100).toLocaleString("en-IN")}`}
            sub="Completed refunds" color="emerald" />
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard icon={Lock} label="ZK Proofs Generated"
            value={s.zk_proofs_generated} sub="ONDC syndicated" color="blue" href="/vyapaar/zk-fraud" />
          <StatCard icon={Shield} label="Risk Score"
            value={`${s.risk_score.toFixed(1)}%`} sub="Dispute/total ratio" color="rose" />
          <StatCard icon={Brain} label="Edge NLP Claims"
            value="2" sub="0 PII uploaded" color="purple" href="/vyapaar/claim-parser" />
        </div>

        {/* System Status Bar */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Database, label: "Outbox Worker", status: "ACTIVE", detail: "0 DEAD_LETTER jobs", color: "emerald" },
            { icon: Zap, label: "eBPF Monitor", status: "MONITORING", detail: "0 unauthorized calls", color: "blue" },
            { icon: Lock, label: "ZK Network (ONDC)", status: "SYNCED", detail: "1 proof syndicated", color: "violet" },
          ].map(({ icon: Icon, label, status, detail, color }) => (
            <div key={label} className="flex items-center gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <div className={`w-8 h-8 rounded-lg bg-${color}-500/10 border border-${color}-500/20 flex items-center justify-center`}>
                <Icon className={`w-4 h-4 text-${color}-400`} />
              </div>
              <div>
                <div className="text-xs text-gray-300 font-medium">{label}</div>
                <div className={`text-[10px] font-mono text-${color}-400`}>{status}</div>
                <div className="text-[10px] text-gray-600">{detail}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Main content split */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Payments table */}
          <div className="lg:col-span-3 rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div>
                <h2 className="font-bold text-white">Recent Transactions</h2>
                <p className="text-xs text-gray-500">Decoupled payment_status ↔ verification_state</p>
              </div>
              <Link to="/vyapaar/disputes"
                className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    {["Ref", "Amount", "Payment", "Verification", "Provider"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs text-gray-600 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {payments.map(p => (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-violet-300">{p.transaction_ref}</div>
                        <div className="text-[10px] text-gray-600">{p.customer_name}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-white">
                        ₹{(p.amount_paise / 100).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={p.payment_status} /></td>
                      <td className="px-4 py-3"><StatusBadge status={p.verification_state} /></td>
                      <td className="px-4 py-3 text-xs text-gray-500">{p.provider}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Refund intents */}
          <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div>
                <h2 className="font-bold text-white">Refund Intents</h2>
                <p className="text-xs text-gray-500">EXCEPTIONS_V1 verdicts</p>
              </div>
              <Link to="/vyapaar/disputes"
                className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors">
                Manage <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-white/[0.03]">
              {refunds.map(r => (
                <div key={r.id} className="p-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs text-violet-300">{r.transaction_ref || r.id.slice(0, 8)}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-white font-bold">
                      ₹{(r.amount_paise / 100).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="mt-1.5 text-[10px] font-mono text-gray-600 truncate">{r.policy_verdict}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Parse Claim", desc: "Edge NLP", icon: Brain, href: "/vyapaar/claim-parser", color: "violet" },
            { label: "New Dispute", desc: "State machine", icon: Shield, href: "/vyapaar/disputes", color: "rose" },
            { label: "Run Outbox", desc: "Worker cycle", icon: Database, href: "/vyapaar/outbox", color: "blue" },
            { label: "Gen ZK Proof", desc: "Fraud syndication", icon: Lock, href: "/vyapaar/zk-fraud", color: "emerald" },
          ].map(({ label, desc, icon: Icon, href, color }) => (
            <Link key={label} to={href}
              className={`group flex items-center gap-3 p-4 rounded-xl border border-${color}-500/10 bg-${color}-500/5 hover:bg-${color}-500/10 hover:border-${color}-500/20 transition-all`}>
              <Icon className={`w-5 h-5 text-${color}-400`} />
              <div>
                <div className="text-sm font-semibold text-white group-hover:text-white">{label}</div>
                <div className="text-xs text-gray-500">{desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </VyapaarLayout>
  );
}
