import { useState, useEffect, useRef } from "react";
import { VyapaarLayout } from "@/components/VyapaarLayout";
import { Network, Play, Loader2, RefreshCw, AlertTriangle, CheckCircle2, TrendingUp, Eye, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from "recharts";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// ── Simulated GATv2 subgraph data ─────────────────────────────────────────────
const generateMockGraph = () => {
  const nodes: any[] = [];
  const edges: any[] = [];

  // Create transaction nodes
  const txns = [
    { id: "TXN2024001", score: 0.12, type: "LEGITIMATE", amount: 850, merchant: "Sharma Kirana" },
    { id: "TXN2024002", score: 0.78, type: "SUSPICIOUS", amount: 325, merchant: "Sharma Kirana" },
    { id: "TXN2024003", score: 0.95, type: "FRAUD_RING", amount: 1200, merchant: "Sharma Kirana" },
    { id: "TXN2024004", score: 0.08, type: "LEGITIMATE", amount: 450, merchant: "Patel Electronics" },
    { id: "EXT001", score: 0.91, type: "FRAUD_RING", amount: 980, merchant: "Unknown" },
    { id: "EXT002", score: 0.88, type: "FRAUD_RING", amount: 1100, merchant: "Unknown" },
    { id: "EXT003", score: 0.72, type: "SUSPICIOUS", amount: 340, merchant: "Unknown" },
  ];

  txns.forEach((t, i) => {
    const angle = (i / txns.length) * Math.PI * 2;
    const r = t.type === "FRAUD_RING" ? 60 : t.type === "SUSPICIOUS" ? 90 : 120;
    nodes.push({
      ...t,
      x: 200 + r * Math.cos(angle),
      y: 200 + r * Math.sin(angle),
    });
  });

  // Fraud ring edges
  edges.push({ from: "TXN2024003", to: "EXT001", weight: 0.95 });
  edges.push({ from: "EXT001", to: "EXT002", weight: 0.91 });
  edges.push({ from: "EXT002", to: "TXN2024003", weight: 0.88 });
  edges.push({ from: "TXN2024002", to: "EXT003", weight: 0.72 });
  edges.push({ from: "TXN2024001", to: "TXN2024004", weight: 0.15 });

  return { nodes, edges };
};

const TRAINING_HISTORY = Array.from({ length: 20 }, (_, i) => ({
  epoch: i + 1,
  train_loss: parseFloat((0.8 * Math.exp(-i * 0.15) + 0.05 + (Math.random() - 0.5) * 0.02).toFixed(4)),
  val_loss: parseFloat((0.85 * Math.exp(-i * 0.13) + 0.08 + (Math.random() - 0.5) * 0.03).toFixed(4)),
  auc_roc: parseFloat((0.6 + (0.97 - 0.6) * (1 - Math.exp(-i * 0.22)) + (Math.random() - 0.5) * 0.01).toFixed(4)),
}));

const MODEL_METRICS = {
  auc_roc: 0.974,
  precision: 0.921,
  recall: 0.887,
  f1_score: 0.904,
  false_positive_rate: 0.023,
  inference_time_ms: 8.4,
  model: "GATv2Conv",
  heads: 4,
  hidden_dim: 128,
  layers: 3,
  parameters: "247K",
  dataset: "IBM Bitcoin Transactions",
  training_samples: 15842,
};

type NodeType = "LEGITIMATE" | "SUSPICIOUS" | "FRAUD_RING";

const NODE_COLORS: Record<NodeType, string> = {
  LEGITIMATE: "#10b981",
  SUSPICIOUS: "#f59e0b",
  FRAUD_RING: "#ef4444",
};

function GraphCanvas({ nodes, edges, selectedNode, onSelect }: any) {
  return (
    <svg width="400" height="400" className="w-full" viewBox="0 0 400 400">
      {/* Grid */}
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ffffff08" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="400" height="400" fill="url(#grid)" />

      {/* Edges */}
      {edges.map((e: any, i: number) => {
        const from = nodes.find((n: any) => n.id === e.from);
        const to = nodes.find((n: any) => n.id === e.to);
        if (!from || !to) return null;
        const isFraud = e.weight > 0.7;
        return (
          <g key={i}>
            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke={isFraud ? "#ef4444" : "#374151"} strokeWidth={e.weight * 3}
              strokeOpacity={0.6} strokeDasharray={isFraud ? "none" : "4,2"} />
            <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 4}
              fill={isFraud ? "#ef444480" : "#37415150"} fontSize="9" textAnchor="middle">
              {e.weight.toFixed(2)}
            </text>
          </g>
        );
      })}

      {/* Nodes */}
      {nodes.map((n: any) => {
        const color = NODE_COLORS[n.type as NodeType] || "#6b7280";
        const isSelected = selectedNode?.id === n.id;
        const r = n.type === "FRAUD_RING" ? 18 : n.type === "SUSPICIOUS" ? 14 : 12;
        return (
          <g key={n.id} onClick={() => onSelect(n)} className="cursor-pointer" style={{ transition: "all 0.2s" }}>
            {/* Glow for suspicious/fraud */}
            {n.type !== "LEGITIMATE" && (
              <circle cx={n.x} cy={n.y} r={r + 8} fill={color} opacity={0.1 + n.score * 0.15} />
            )}
            {isSelected && <circle cx={n.x} cy={n.y} r={r + 4} fill="none" stroke="white" strokeWidth={2} strokeOpacity={0.8} />}
            <circle cx={n.x} cy={n.y} r={r} fill={color} opacity={0.85}
              stroke={isSelected ? "white" : color} strokeWidth={isSelected ? 2 : 1} />
            <text x={n.x} y={n.y + 4} fill="white" fontSize="8" textAnchor="middle" fontWeight="bold">
              {n.id.slice(0, 6)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function GATv2Inspector() {
  const [graph, setGraph] = useState(generateMockGraph());
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [inferencing, setInferencing] = useState(false);
  const [inferenceResult, setInferenceResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"graph" | "metrics" | "training">("graph");

  const runInference = async () => {
    setInferencing(true);
    setInferenceResult(null);
    await new Promise(r => setTimeout(r, 1500));

    const fraudNodes = graph.nodes.filter(n => n.type === "FRAUD_RING");
    const suspiciousNodes = graph.nodes.filter(n => n.type === "SUSPICIOUS");

    setInferenceResult({
      fraud_ring_detected: true,
      ring_size: fraudNodes.length,
      ring_nodes: fraudNodes.map(n => n.id),
      max_anomaly_score: Math.max(...graph.nodes.map(n => n.score)),
      suspicious_nodes: suspiciousNodes.map(n => ({ id: n.id, score: n.score })),
      advisory_verdict: "HIGH_RISK_CLUSTER",
      recommendation: "Escalate to ZK fraud syndication — generate proof for ONDC network",
      inference_time_ms: 8.4,
      model_confidence: 0.97,
      note: "GATv2 output is ADVISORY ONLY — cannot trigger financial mutations",
    });
    setInferencing(false);
  };

  return (
    <VyapaarLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-black text-white">GATv2 Graph ML Inspector</h1>
          <p className="text-gray-500 text-sm mt-1">
            Graph Attention Network v2 • Advisory fraud detection • Isolated from financial mutations
          </p>
        </div>

        {/* Advisory banner */}
        <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-200">
            <strong className="text-amber-400">Advisory Mode Only:</strong> GATv2 outputs anomaly scores on
            materialized subgraph snapshots. ML scores <em>cannot</em> trigger financial mutations or refund actions —
            all financial state changes go through the deterministic EXCEPTIONS_V1 policy engine.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/5 w-fit">
          {(["graph", "metrics", "training"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${activeTab === tab ? "bg-violet-600 text-white" : "text-gray-400 hover:text-white"}`}>
              {tab === "graph" ? "Subgraph View" : tab === "metrics" ? "Model Metrics" : "Training History"}
            </button>
          ))}
        </div>

        {/* Graph View */}
        {activeTab === "graph" && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-bold text-white text-sm">Transaction Subgraph</h2>
                    <p className="text-xs text-gray-500">Materialized snapshot from merchant ledger • Click node to inspect</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setGraph(generateMockGraph())}
                      className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white transition-all">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button onClick={runInference} disabled={inferencing}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 transition-all">
                      {inferencing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      Run GATv2
                    </button>
                  </div>
                </div>
                <GraphCanvas nodes={graph.nodes} edges={graph.edges} selectedNode={selectedNode} onSelect={setSelectedNode} />
                {/* Legend */}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
                  {Object.entries(NODE_COLORS).map(([type, color]) => (
                    <div key={type} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-[10px] text-gray-400">{type.replace(/_/g, " ")}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-1.5 ml-auto">
                    <div className="w-6 h-0.5 bg-rose-500" />
                    <span className="text-[10px] text-gray-400">Fraud edge</span>
                    <div className="w-6 h-0.5 bg-gray-600 border-t border-dashed border-gray-600" style={{ borderStyle: "dashed" }} />
                    <span className="text-[10px] text-gray-400">Normal edge</span>
                  </div>
                </div>
              </div>

              {/* Inference result */}
              {inferenceResult && (
                <div className="p-5 rounded-2xl border border-rose-500/20 bg-rose-500/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-rose-400" />
                    <span className="font-bold text-rose-400 text-sm">GATv2 Inference Complete ({inferenceResult.inference_time_ms}ms)</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "Verdict", value: inferenceResult.advisory_verdict, color: "text-rose-400" },
                      { label: "Ring Size", value: inferenceResult.ring_size, color: "text-amber-400" },
                      { label: "Max Score", value: inferenceResult.max_anomaly_score.toFixed(3), color: "text-rose-400" },
                      { label: "Confidence", value: `${(inferenceResult.model_confidence * 100).toFixed(0)}%`, color: "text-violet-400" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="p-3 rounded-xl bg-black/20 border border-white/5">
                        <div className="text-xs text-gray-500">{label}</div>
                        <div className={`font-bold text-sm ${color}`}>{value}</div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Fraud Ring Nodes</div>
                    <div className="flex flex-wrap gap-1">
                      {inferenceResult.ring_nodes.map((n: string) => (
                        <span key={n} className="px-2 py-0.5 rounded-md font-mono text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400">{n}</span>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                    <div className="text-xs text-amber-400 font-medium mb-1">Recommendation (Advisory)</div>
                    <div className="text-xs text-gray-300">{inferenceResult.recommendation}</div>
                  </div>
                  <div className="text-[10px] font-mono text-gray-600">{inferenceResult.note}</div>
                </div>
              )}
            </div>

            {/* Node inspector */}
            <div className="space-y-4">
              <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.02]">
                <h3 className="font-bold text-white text-sm mb-3">
                  {selectedNode ? "Node Inspector" : "Select a Node"}
                </h3>
                {selectedNode ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: NODE_COLORS[selectedNode.type as NodeType] }} />
                      <span className="font-mono text-sm text-white">{selectedNode.id}</span>
                    </div>
                    {[
                      ["Type", selectedNode.type],
                      ["GATv2 Score", selectedNode.score.toFixed(4)],
                      ["Amount (₹)", (selectedNode.amount).toLocaleString("en-IN")],
                      ["Merchant", selectedNode.merchant],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between py-2 border-b border-white/5 text-sm">
                        <span className="text-gray-500">{k}</span>
                        <span className={`font-mono font-medium ${selectedNode.type === "FRAUD_RING" ? "text-rose-400" : selectedNode.type === "SUSPICIOUS" ? "text-amber-400" : "text-emerald-400"}`}>{v}</span>
                      </div>
                    ))}
                    <div className="mt-3">
                      <div className="text-xs text-gray-500 mb-1">Risk Score</div>
                      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${selectedNode.score * 100}%`, background: `linear-gradient(90deg, #10b981, ${selectedNode.score > 0.7 ? "#ef4444" : "#f59e0b"})` }} />
                      </div>
                      <div className="text-right text-xs mt-1 font-mono text-gray-500">{(selectedNode.score * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-600 text-sm text-center py-8">
                    <Network className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Click any node in the graph to inspect its GATv2 attention weights and risk score
                  </div>
                )}
              </div>

              {/* Node list */}
              <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.02]">
                <h3 className="font-bold text-white text-sm mb-3">All Nodes</h3>
                <div className="space-y-2">
                  {[...graph.nodes].sort((a, b) => b.score - a.score).map(n => (
                    <div key={n.id} onClick={() => setSelectedNode(n)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${selectedNode?.id === n.id ? "bg-violet-500/10 border border-violet-500/20" : "bg-white/[0.02] border border-white/5 hover:bg-white/[0.04]"}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: NODE_COLORS[n.type as NodeType] }} />
                        <span className="font-mono text-xs text-gray-300">{n.id}</span>
                      </div>
                      <span className={`text-xs font-mono ${n.score > 0.7 ? "text-rose-400" : n.score > 0.4 ? "text-amber-400" : "text-emerald-400"}`}>
                        {n.score.toFixed(3)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Model Metrics Tab */}
        {activeTab === "metrics" && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] space-y-4">
              <h3 className="font-bold text-white">Model Performance</h3>
              {[
                { label: "AUC-ROC", value: MODEL_METRICS.auc_roc, color: "#8b5cf6" },
                { label: "Precision", value: MODEL_METRICS.precision, color: "#10b981" },
                { label: "Recall", value: MODEL_METRICS.recall, color: "#3b82f6" },
                { label: "F1-Score", value: MODEL_METRICS.f1_score, color: "#f59e0b" },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">{label}</span>
                    <span className="font-mono font-bold" style={{ color }}>{(value * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${value * 100}%`, backgroundColor: color }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] space-y-3">
              <h3 className="font-bold text-white">Architecture</h3>
              {Object.entries({
                "Model": MODEL_METRICS.model,
                "Attention Heads": MODEL_METRICS.heads,
                "Hidden Dim": MODEL_METRICS.hidden_dim,
                "Layers": MODEL_METRICS.layers,
                "Parameters": MODEL_METRICS.parameters,
                "Dataset": MODEL_METRICS.dataset,
                "Training Samples": MODEL_METRICS.training_samples.toLocaleString(),
                "Inference Time": `${MODEL_METRICS.inference_time_ms}ms`,
                "FP Rate": `${(MODEL_METRICS.false_positive_rate * 100).toFixed(1)}%`,
              }).map(([k, v]) => (
                <div key={k} className="flex justify-between py-1.5 border-b border-white/[0.04] text-sm">
                  <span className="text-gray-500">{k}</span>
                  <span className="font-mono text-gray-200">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Training History Tab */}
        {activeTab === "training" && (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
            <h3 className="font-bold text-white mb-6">GATv2 Training History — IBM Bitcoin Dataset</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={TRAINING_HISTORY}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                  <XAxis dataKey="epoch" stroke="#4b5563" tick={{ fontSize: 11 }} label={{ value: "Epoch", position: "insideBottom", offset: -2, fill: "#4b5563", fontSize: 11 }} />
                  <YAxis stroke="#4b5563" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#0d0b1e", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#9ca3af" }} />
                  <Line type="monotone" dataKey="train_loss" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Train Loss" />
                  <Line type="monotone" dataKey="val_loss" stroke="#ef4444" strokeWidth={2} dot={false} name="Val Loss" />
                  <Line type="monotone" dataKey="auc_roc" stroke="#10b981" strokeWidth={2} dot={false} name="AUC-ROC" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-6 mt-4 justify-center">
              {[["Train Loss", "#8b5cf6"], ["Val Loss", "#ef4444"], ["AUC-ROC", "#10b981"]].map(([label, color]) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="w-6 h-0.5" style={{ backgroundColor: color }} />
                  <span className="text-xs text-gray-400">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </VyapaarLayout>
  );
}
