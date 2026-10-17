# Vyapaar Kavach — व्यापार कवच
## Resilient & Privacy-Preserving Exception Resolution for India's Decentralized Commerce

> **Team SmurfPakad | India Hackathon 2026**

[![License: MIT](https://img.shields.io/badge/License-MIT-violet.svg)](LICENSE)
[![ONDC Ready](https://img.shields.io/badge/ONDC-Ready-orange.svg)](https://ondc.org)
[![ZK-SNARKs](https://img.shields.io/badge/ZK-Groth16-purple.svg)](https://github.com/iden3/snarkjs)
[![DPDP 2023](https://img.shields.io/badge/DPDP_2023-Compliant-green.svg)](https://meity.gov.in)

---

## Problem Statement

Small merchants in India face critical operational failures when processing refunds and disputes in decentralized payment ecosystems (ONDC):

1. **Double-Payouts** — Network partitions cause duplicate refund executions
2. **PII Leakage** — Customer claims processed in cloud violate DPDP Act 2023
3. **Opaque Fraud Networks** — No privacy-preserving way to share fraud intelligence
4. **Unstructured Claims** — WhatsApp/SMS disputes have no structured resolution path

---

## Solution: Vyapaar Kavach

A **5-layer architecture** that solves each challenge deterministically:

| Layer | Technology | Solves |
|---|---|---|
| **Edge NLP** | ONNX Quantized SLM (WebAssembly) | PII-safe claim parsing |
| **State Machine** | EXCEPTIONS_V1 + PostgreSQL triggers | Deterministic dispute resolution |
| **Transactional Outbox** | Atomic lease + idempotency keys | Double-payout prevention |
| **ZK Fraud Syndication** | Groth16 ZK-SNARKs | Privacy-preserving intelligence sharing |
| **Graph ML** | GATv2 (PyTorch Geometric) | Fraud ring detection |

---

## Quick Start

### Frontend (Vyapaar Kavach UI)

```bash
cd SmurfPakad_v1
npm install
npm run dev
```

Navigate to `http://localhost:8080` → You'll see the **Vyapaar Kavach** landing page.

### Backend (FastAPI)

```bash
cd SmurfPakad_v1/Backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The backend auto-initializes the SQLite database with realistic demo data on first run.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      MERCHANT'S DEVICE                          │
│  ┌──────────────────┐  ┌──────────────────────────────────────┐ │
│  │  ONNX SLM Engine │  │      React/Vite PWA Frontend         │ │
│  │  (WebAssembly)   │  │   • Offline-first via Service Worker │ │
│  │  Hinglish NLP    │  │   • ZK proof visualization           │ │
│  │  Zero PII upload │  │   • Real-time outbox monitor         │ │
│  └──────────────────┘  └──────────────────────────────────────┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │ Structured intents only (no PII)
┌────────────────────────────▼────────────────────────────────────┐
│                    FastAPI GATEWAY (Zones 1+2)                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │           EXCEPTIONS_V1 Policy Engine                      │ │
│  │  payment_status × verification_state → deterministic verdict│ │
│  └────────────────────────────────────────────────────────────┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │ ACID transactions
┌────────────────────────────▼────────────────────────────────────┐
│              POSTGRESQL DATABASE (Ledger + Governance)           │
│  • refund_intents (state machine)  • outbox_jobs (atomic lease) │
│  • governance_audit_logs (PL/pgSQL triggers, append-only)       │
│  • zk_fraud_proofs (cryptographic proof store)                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼──────┐    ┌────────▼───────┐   ┌───────▼────────┐
│   eBPF       │    │    GATv2 ML    │   │  ZK-SNARK      │
│  Outbox      │    │  Fraud Ring    │   │  Groth16       │
│  Workers     │    │  Detection     │   │  Syndication   │
│  Monitoring  │    │  (Advisory)    │   │  (ONDC Net)    │
└──────────────┘    └────────────────┘   └────────────────┘
```

---

## Key Pages (Vyapaar Kavach)

| Route | Page | Description |
|---|---|---|
| `/` | **Landing** | Merchant-first landing with architecture overview |
| `/vyapaar/dashboard` | **Dashboard** | Live stats, payment ledger, refund intents |
| `/vyapaar/disputes` | **Dispute Resolution** | State machine + policy matrix + conflict management |
| `/vyapaar/claim-parser` | **Edge NLP** | ONNX SLM claim parsing with Hinglish support |
| `/vyapaar/outbox` | **Outbox Monitor** | Worker status, eBPF events, lease visualization |
| `/vyapaar/zk-fraud` | **ZK Fraud Sync** | Proof generation, verification, ONDC syndication |
| `/vyapaar/audit` | **Audit Export** | SHA-256 signed cryptographic audit packets |
| `/cryptoflow` | **SmurfPakad** | GATv2 Bitcoin fraud detection (original system) |

---

## Backend API Endpoints

### Vyapaar Kavach APIs

| Endpoint | Method | Description |
|---|---|---|
| `GET /api/v1/vyapaar/disputes/dashboard` | GET | Merchant dashboard stats |
| `GET /api/v1/vyapaar/disputes/payments` | GET | Payment ledger (tenant-scoped) |
| `POST /api/v1/vyapaar/disputes/refunds/create` | POST | Create idempotent refund intent |
| `PATCH /api/v1/vyapaar/disputes/refunds/{id}/status` | PATCH | State machine transition |
| `POST /api/v1/vyapaar/disputes/payments/{id}/webhook-reconcile` | POST | Resolve SUBMISSION_UNKNOWN |
| `POST /api/v1/vyapaar/claims/parse` | POST | Edge NLP claim parsing |
| `POST /api/v1/vyapaar/outbox/simulate-worker-run` | POST | Run outbox worker cycle |
| `GET /api/v1/vyapaar/outbox/ebpf-status` | GET | eBPF monitoring status |
| `POST /api/v1/vyapaar/zk/generate` | POST | Generate ZK fraud proof |
| `POST /api/v1/vyapaar/zk/verify` | POST | Verify ZK proof |
| `GET /api/v1/vyapaar/audit/export/json` | GET | SHA-256 signed audit packet |

---

## Critical Innovation Points

### 1. Double-Spend Prevention (Outbox Pattern)

```sql
-- Atomic lease acquisition — only ONE worker can claim
UPDATE outbox_jobs
SET status='LEASED', lease_id=?, lease_expires_at=?
WHERE id=? AND status='PENDING';  -- Conditional update = atomic lock
```

### 2. SUBMISSION_UNKNOWN Lock

When a webhook times out, the system immediately locks the refund intent:
```
payment_status=PENDING + verification_state=SUBMISSION_UNKNOWN
→ EXCEPTIONS_V1_TIMEOUT_LOCK
→ Intent status: SUBMISSION_UNKNOWN (cannot be modified)
→ Outbox job: NOT created (prevents duplicate provider calls)
```

### 3. ZK Proof Generation (Groth16)

```
Private inputs (HIDDEN): merchant_id, transaction_ids, amounts, timestamps
                  ↓
Circom Circuit: anomaly_score = f(dispute_velocity, cluster_size, amounts)
                  ↓
Groth16 Prover: π = (π_A, π_B, π_C) — 192 bytes on BN128 curve
                  ↓
Public outputs (SHARED): anomaly_score, cluster_size, exceeds_threshold
```

### 4. Edge NLP (ONNX SLM)

```
Customer WhatsApp: "Maine 325 rupaye bheje par kuch nahi mila TXN2024002"
        ↓ (processed on device, never uploaded)
Intent: REFUND | Amount: ₹325 | Ref: TXN2024002 | Urgency: HIGH
        ↓ (only structured intent sent to API)
EXCEPTIONS_V1 evaluation → Create refund intent
```

---

## Data Model

```sql
tenants           -- Merchant registry (multi-tenant)
payments          -- Dual-track: payment_status ⊥ verification_state
provider_events   -- Webhook event log
refund_intents    -- State machine core (ACID)
outbox_jobs       -- Atomic lease workers
governance_audit_logs  -- Append-only, PL/pgSQL trigger-populated
zk_fraud_proofs   -- Cryptographic proof store
claims            -- Parsed intents (PII never stored)
```

---

## Team SmurfPakad

Built for the **India International Hackathon 2026** — demonstrating that deterministic financial systems, edge AI, and zero-knowledge cryptography can protect India's 18,000+ small merchants in the ONDC ecosystem.

**Technology Stack:**
- Frontend: React 18 + TypeScript + Vite + Tailwind CSS
- Backend: Python + FastAPI + SQLite (PostgreSQL-ready)
- ML: PyTorch Geometric GATv2
- Cryptography: Groth16 ZK-SNARKs (Circom simulation)
- Edge AI: ONNX Runtime simulation (WebAssembly-ready)
- Security: eBPF network monitoring simulation