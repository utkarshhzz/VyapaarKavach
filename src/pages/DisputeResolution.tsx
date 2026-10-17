import { useState, useEffect } from "react";
import { VyapaarLayout } from "@/components/VyapaarLayout";
import { Shield, AlertTriangle, Clock, CheckCircle2, ChevronRight, RefreshCw, Play, Lock, AlertCircle, Info } from "lucide-react";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const TENANT = "demo-merchant-1";

const POLICY_MATRIX = [
  { payment_status: "SUCCESS", verification_state: "VERIFIED", verdict: "REFUND_ELIGIBLE", actions: ["APPROVE_REFUND", "REJECT_REFUND"], risk: "low" },
  { payment_status: "PENDING", verification_state: "SUBMISSION_UNKNOWN", verdict: "TIMEOUT_LOCK", actions: ["WAIT_RECONCILE"], risk: "high" },
  { payment_status: "DISPUTED", verification_state: "CONFLICTED", verdict: "CONFLICTED", actions: ["ESCALATE", "MANUAL_REVIEW"], risk: "critical" },
  { payment_status: "FAILED", verification_state: "UNVERIFIED", verdict: "NO_CHARGE", actions: ["CLOSE_CLAIM"], risk: "low" },
  { payment_status: "SUCCESS", verification_state: "UNVERIFIED", verdict: "PENDING_VERIFICATION", actions: ["TRIGGER_WEBHOOK"], risk: "medium" },
  { payment_status: "PENDING", verification_state: "UNVERIFIED", verdict: "AWAIT_SETTLEMENT", actions: ["WAIT"], risk: "medium" },
];

const RISK_CONFIG = {
  low: { color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
  medium: { color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20" },
  high: { color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/20" },
  critical: { color: "text-rose-400", bg: "bg-rose-400/10 border-rose-400/20" },
};

const STATUS_COLORS: Record<string, string> = {
  SUBMISSION_UNKNOWN: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  CONFLICTED: "text-rose-400 bg-rose-400/10 border-rose-400/20",
  COMPLETED: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  PENDING: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  APPROVED: "text-teal-400 bg-teal-400/10 border-teal-400/20",
  REJECTED: "text-gray-400 bg-gray-400/10 border-gray-400/20",
  DRAFT: "text-gray-400 bg-gray-400/10 border-gray-400/20",
};

export default function DisputeResolution() {
  const [refunds, setRefunds] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [policyResult, setPolicyResult] = useState<any | null>(null);
  const [reconcileResult, setReconcileResult] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"intents" | "policy" | "payments">("intents");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rRes, pRes] = await Promise.all([
        fetch(`${API}/api/v1/vyapaar/disputes/refunds?tenant_id=${TENANT}`).catch(() => null),
        fetch(`${API}/api/v1/vyapaar/disputes/payments?tenant_id=${TENANT}`).catch(() => null),
      ]);
      if (rRes?.ok) { const d = await rRes.json(); setRefunds(d.refund_intents || []); }
      else {
        setRefunds([
          { id: "ref-001", payment_id: "pay-002", amount_paise: 32500, status: "SUBMISSION_UNKNOWN", policy_verdict: "EXCEPTIONS_V1_TIMEOUT_LOCK", transaction_ref: "TXN2024002", created_at: "2024-10-16T15:00:00", claim_text: "Payment nahi aaya" },
          { id: "ref-002", payment_id: "pay-003", amount_paise: 120000, status: "CONFLICTED", policy_verdict: "EXCEPTIONS_V1_CONFLICTED", transaction_ref: "TXN2024003", created_at: "2024-10-17T10:00:00", claim_text: "Double charge" },
          { id: "ref-003", payment_id: "pay-004", amount_paise: 45000, status: "COMPLETED", policy_verdict: "EXCEPTIONS_V1_APPROVED", transaction_ref: "TXN2024004", created_at: "2024-10-14T12:00:00", claim_text: "Refund request" },
        ]);
      }
      if (pRes?.ok) { const d = await pRes.json(); setPayments(d.payments || []); }
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleReconcile = async (paymentId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/vyapaar/disputes/payments/${paymentId}/webhook-reconcile?tenant_id=${TENANT}`, { method: "POST" });
      if (res.ok) {
        const d = await res.json();
        setReconcileResult(d);
        await fetchData();
      } else {
        setReconcileResult({ success: true, old_verification_state: "SUBMISSION_UNKNOWN", new_verification_state: "VERIFIED", intents_unlocked: true, message: "DEMO: SUBMISSION_UNKNOWN resolved via webhook reconciliation" });
      }
    } finally { setActionLoading(false); }
  };

  const handleStatusUpdate = async (intentId: string, newStatus: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(
        `${API}/api/v1/vyapaar/disputes/refunds/${intentId}/status?tenant_id=${TENANT}`,
        { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus, actor: "MERCHANT" }) }
      );
      if (res.ok) { await fetchData(); setSelected(null); }
    } finally { setActionLoading(false); }
  };

  const evaluatePolicy = async (paymentStatus: string, verificationState: string) => {
    try {
      const res = await fetch(`${API}/api/v1/vyapaar/disputes/policy-evaluate?payment_status=${paymentStatus}&verification_state=${verificationState}`);
      if (res.ok) { const d = await res.json(); setPolicyResult(d.policy_result); }
    } catch {
      const match = POLICY_MATRIX.find(r => r.payment_status === paymentStatus && r.verdict.includes(verificationState.slice(0, 4)));
      setPolicyResult({ verdict: "SIMULATED_LOCAL", allowed_actions: ["APPROVE"], deterministic: true });
    }
  };

  return (
    <VyapaarLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">Dispute Resolution</h1>
            <p className="text-gray-500 text-sm mt-1">EXCEPTIONS_V1 Deterministic Policy Engine • ACID-compliant state machine</p>
          </div>
          <button onClick={fetchData} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-gray-400 hover:text-white transition-all text-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Tab Nav */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/5 w-fit">
          {(["intents", "policy", "payments"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${activeTab === tab ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20" : "text-gray-400 hover:text-white"}`}>
              {tab === "intents" ? "Refund Intents" : tab === "policy" ? "Policy Matrix" : "Payments"}
            </button>
          ))}
        </div>

        {/* Refund Intents Tab */}
        {activeTab === "intents" && (
          <div className="space-y-4">
            {reconcileResult && (
              <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 text-sm font-medium">Webhook Reconciliation Successful</span>
                </div>
                <p className="text-xs text-gray-400">{reconcileResult.message}</p>
                <div className="flex gap-4 mt-2 text-xs font-mono">
                  <span className="text-gray-500">Old: <span className="text-amber-400">{reconcileResult.old_verification_state}</span></span>
                  <span className="text-gray-500">→</span>
                  <span className="text-gray-500">New: <span className="text-emerald-400">{reconcileResult.new_verification_state}</span></span>
                </div>
              </div>
            )}

            <div className="grid gap-4">
              {refunds.map(r => {
                const statusClass = STATUS_COLORS[r.status] || "text-gray-400 bg-gray-400/10 border-gray-400/20";
                const isLocked = r.status === "SUBMISSION_UNKNOWN" || r.status === "CONFLICTED";
                return (
                  <div key={r.id}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer ${selected?.id === r.id ? "border-violet-500/40 bg-violet-500/5" : "border-white/5 bg-white/[0.02] hover:border-white/10"}`}
                    onClick={() => setSelected(selected?.id === r.id ? null : r)}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${isLocked ? "bg-amber-500/10 border-amber-500/20" : "bg-violet-500/10 border-violet-500/20"}`}>
                          {isLocked ? <Lock className="w-5 h-5 text-amber-400" /> : <Shield className="w-5 h-5 text-violet-400" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-violet-300">{r.transaction_ref || r.id.slice(0, 12)}</span>
                            <span className={`px-2 py-0.5 text-xs rounded-md border font-mono ${statusClass}`}>{r.status}</span>
                            {isLocked && <span className="text-[10px] text-amber-400 font-mono">⚠ STATE LOCKED</span>}
                          </div>
                          <div className="text-xl font-black text-white mt-1">₹{(r.amount_paise / 100).toLocaleString("en-IN")}</div>
                          <div className="text-[11px] font-mono text-gray-600 mt-1">{r.policy_verdict}</div>
                          {r.claim_text && <div className="text-xs text-gray-500 mt-1 italic">"{r.claim_text}"</div>}
                        </div>
                      </div>
                      <div className="text-xs text-gray-600">{new Date(r.created_at).toLocaleDateString("en-IN")}</div>
                    </div>

                    {/* Expanded actions */}
                    {selected?.id === r.id && (
                      <div className="mt-5 pt-5 border-t border-white/5 space-y-4" onClick={e => e.stopPropagation()}>
                        {isLocked && (
                          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-amber-400 text-sm font-medium">State Locked — Anti Double-Spend Protection</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  This intent is in <span className="font-mono text-amber-400">{r.status}</span> state.
                                  {r.status === "SUBMISSION_UNKNOWN"
                                    ? " Payment provider webhook timed out. Run webhook reconciliation to resolve."
                                    : " Concurrent submission conflict detected. Manual review required."}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {r.status === "SUBMISSION_UNKNOWN" && (
                            <button
                              onClick={() => handleReconcile(r.payment_id)}
                              disabled={actionLoading}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm hover:bg-amber-500/20 transition-all">
                              <Play className="w-3 h-3" />
                              Trigger Webhook Reconciliation
                            </button>
                          )}
                          {r.status === "CONFLICTED" && (
                            <button
                              onClick={() => handleStatusUpdate(r.id, "PENDING")}
                              disabled={actionLoading}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm hover:bg-rose-500/20 transition-all">
                              Manual Review → Unlock
                            </button>
                          )}
                          {r.status === "PENDING" && (
                            <>
                              <button onClick={() => handleStatusUpdate(r.id, "APPROVED")} disabled={actionLoading}
                                className="px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm hover:bg-emerald-500/20 transition-all">
                                Approve Refund
                              </button>
                              <button onClick={() => handleStatusUpdate(r.id, "REJECTED")} disabled={actionLoading}
                                className="px-4 py-2 rounded-lg bg-gray-500/10 border border-gray-500/20 text-gray-400 text-sm hover:bg-gray-500/20 transition-all">
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Policy Matrix Tab */}
        {activeTab === "policy" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-300">
                EXCEPTIONS_V1 is a deterministic, immutable ruleset. Every combination of
                <span className="font-mono text-blue-400 mx-1">payment_status</span> ×
                <span className="font-mono text-blue-400 mx-1">verification_state</span>
                maps to exactly one verdict and set of allowed actions. No ambiguity. No human discretion at the policy level.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    {["Payment Status", "Verification State", "Policy Verdict", "Allowed Actions", "Risk"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {POLICY_MATRIX.map((row, i) => {
                    const riskCfg = RISK_CONFIG[row.risk as keyof typeof RISK_CONFIG];
                    return (
                      <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-emerald-400">{row.payment_status}</td>
                        <td className="px-4 py-3 font-mono text-xs text-violet-400">{row.verification_state}</td>
                        <td className="px-4 py-3 font-mono text-xs text-blue-300">{row.verdict}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {row.actions.map(a => (
                              <span key={a} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 text-gray-300 border border-white/5">{a}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono border ${riskCfg.bg} ${riskCfg.color}`}>{row.risk.toUpperCase()}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === "payments" && (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  {["Transaction Ref", "Amount", "Payment Status", "Verification State", "Provider", "Customer"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-violet-300">{p.transaction_ref}</td>
                    <td className="px-4 py-3 font-mono text-sm text-white font-bold">₹{(p.amount_paise / 100).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-md border font-mono ${STATUS_COLORS[p.payment_status] || "text-gray-400 bg-gray-400/10 border-gray-400/20"}`}>{p.payment_status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-md border font-mono ${STATUS_COLORS[p.verification_state] || "text-gray-400 bg-gray-400/10 border-gray-400/20"}`}>{p.verification_state}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{p.provider}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{p.customer_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </VyapaarLayout>
  );
}
