# Contributing to Vyapaar Kavach

> **Team SmurfPakad | India Hackathon 2026**

Thank you for contributing! This guide covers how to set up your dev environment, branch naming, commit conventions, and the PR process.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Repo Structure](#repo-structure)
- [Quick Setup](#quick-setup)
- [Branch Strategy](#branch-strategy)
- [Commit Conventions](#commit-conventions)
- [PR Process](#pr-process)
- [Backend Dev Guide](#backend-dev-guide)
- [Frontend Dev Guide](#frontend-dev-guide)
- [Architecture Decisions](#architecture-decisions)
- [Running Tests](#running-tests)

---

## Project Overview

Vyapaar Kavach is a **5-layer system** for Indian merchants:

| Layer | Owner | Tech |
|---|---|---|
| **Edge NLP** | Backend | FastAPI + ONNX simulation |
| **Dispute State Machine** | Backend | SQLite/PostgreSQL + EXCEPTIONS_V1 |
| **Transactional Outbox** | Backend | Atomic lease pattern |
| **ZK Fraud Syndication** | Backend | Groth16 ZK-SNARK simulation |
| **GATv2 Graph ML** | Backend/ML | PyTorch Geometric |
| **Dashboard UI** | Frontend | React + TypeScript + Vite |

---

## Repo Structure

```
VyapaarKavach/
├── Backend/                  ← FastAPI backend (Python)
│   ├── app/
│   │   ├── db/
│   │   │   └── vyapaar_models.py   ← SQLAlchemy models + seed data
│   │   ├── routers/
│   │   │   ├── vyapaar_disputes.py ← EXCEPTIONS_V1 state machine
│   │   │   ├── vyapaar_claims.py   ← Edge NLP claim parser
│   │   │   ├── vyapaar_outbox.py   ← Transactional outbox worker
│   │   │   ├── vyapaar_zk.py       ← ZK fraud proof generation
│   │   │   └── vyapaar_audit.py    ← Cryptographic audit export
│   │   ├── services/
│   │   │   └── ml_service.py       ← GATv2 model service
│   │   └── config.py
│   ├── main.py               ← FastAPI app entry point
│   ├── requirements.txt
│   └── .env.example
├── src/                      ← React/TypeScript frontend
│   ├── pages/
│   │   ├── VyapaarLanding.tsx
│   │   ├── MerchantDashboard.tsx
│   │   ├── DisputeResolution.tsx
│   │   ├── ClaimParser.tsx
│   │   ├── OutboxMonitor.tsx
│   │   ├── ZKFraudSync.tsx
│   │   ├── GATv2Inspector.tsx
│   │   └── AuditExport.tsx
│   └── components/
│       └── VyapaarLayout.tsx ← Sidebar + topbar layout
├── docs/                     ← Architecture docs
│   ├── ZK_SETUP.md
│   ├── ONNX_SETUP.md
│   └── ONDC_INTEGRATION.md
├── .github/
│   ├── workflows/
│   │   └── ci.yml            ← GitHub Actions CI
│   └── PULL_REQUEST_TEMPLATE.md
└── README.md
```

---

## Quick Setup

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **Git**

### Backend

```bash
cd Backend

# Create virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env with your values (see below for required keys)

# Start backend (auto-creates SQLite DB with demo data)
uvicorn main:app --reload --port 8000
```

The backend will be at **http://localhost:8000**
API docs at **http://localhost:8000/docs**

### Frontend

```bash
# From repo root
cp .env.example .env.local
# Set VITE_API_BASE_URL=http://localhost:8000 in .env.local

npm install
npm run dev
```

Frontend at **http://localhost:5173/**

---

## Branch Strategy

```
main              ← stable, always deployable
├── dev           ← integration branch (merge all features here first)
│   ├── feat/vyapaar-<feature>    ← new Vyapaar Kavach features
│   ├── fix/vyapaar-<fix>         ← bug fixes
│   ├── feat/smurfpakad-<feature> ← SmurfPakad GATv2 features
│   └── chore/<what>              ← tooling, CI, docs
```

**Rules:**
1. **Never commit directly to `main`** — always PR via `dev`
2. Branch names must match the pattern above
3. Delete branches after merge

---

## Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]
[optional footer]
```

**Types:**

| Type | When to use |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or fixing tests |
| `docs` | Documentation only |
| `chore` | Build, CI, deps |
| `perf` | Performance improvement |

**Scopes:** `disputes`, `outbox`, `claims`, `zk`, `audit`, `gatv2`, `ui`, `db`, `ci`

**Examples:**
```
feat(disputes): add webhook reconciliation endpoint for SUBMISSION_UNKNOWN
fix(outbox): prevent race condition in atomic lease acquisition
test(zk): add Groth16 proof verification unit tests
docs(ondc): add ONDC subscriber setup guide
chore(ci): add Python 3.11 to test matrix
```

---

## PR Process

1. Fork or branch from `dev`
2. Make your changes with tests
3. Run `pytest Backend/tests/` locally — must pass
4. Fill in the PR template
5. Request review from at least **1 teammate**
6. Squash-merge into `dev` when approved

---

## Backend Dev Guide

### Adding a New Vyapaar Endpoint

1. Add your route to the relevant router in `Backend/app/routers/vyapaar_*.py`
2. Export it in `Backend/app/routers/__init__.py`
3. Include it in `Backend/main.py` under the Vyapaar section
4. Write a test in `Backend/tests/test_vyapaar_*.py`

### Database Changes

All schema changes go in `Backend/app/db/vyapaar_models.py`.
- Run `init_db()` to apply (it's idempotent via `CREATE TABLE IF NOT EXISTS`)
- For destructive changes, provide a migration SQL in `Backend/migrations/`

### Policy Engine Changes

`EXCEPTIONS_V1` is in `Backend/app/routers/vyapaar_disputes.py` — the `POLICY_ENGINE` dict.
**Any change must be discussed in a team PR** — this is the financial correctness core.

### Running the Backend

```bash
# Development (auto-reload)
uvicorn main:app --reload --port 8000

# Production
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## Frontend Dev Guide

> Frontend is React 18 + TypeScript + Vite + Tailwind CSS.

### Adding a New Page

1. Create `src/pages/YourPage.tsx`
2. Wrap with `<VyapaarLayout>` component
3. Add a route in `src/App.tsx`
4. Add to the nav in `src/components/VyapaarLayout.tsx`

### API Calls

All API calls use the `VITE_API_BASE_URL` env variable:

```typescript
const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
```

All pages gracefully fall back to **demo/mock data** when the backend is unreachable.

---

## Architecture Decisions

| Decision | Choice | Reason |
|---|---|---|
| DB for demo | SQLite | Zero-config, runs anywhere |
| DB for production | PostgreSQL | WAL mode, SKIP LOCKED for outbox |
| ZK Proof | Groth16 simulation | Real `snarkjs` needs Node+circom compile step |
| Edge NLP | ONNX simulation | Real ONNX model is 45MB, hosted separately |
| State machine | Deterministic dict lookup | No ambiguity, auditble, testable |
| Outbox locking | Atomic UPDATE WHERE status='PENDING' | Works on SQLite AND PostgreSQL |

---

## Running Tests

```bash
cd Backend

# All tests
pytest tests/ -v

# Vyapaar Kavach tests only
pytest tests/test_vyapaar_disputes.py -v
pytest tests/test_vyapaar_outbox.py -v
pytest tests/test_vyapaar_zk.py -v

# With coverage
pytest tests/ --cov=app --cov-report=html
```

---

## Getting Help

- **Slack/WhatsApp:** Team SmurfPakad group
- **Issues:** Open a GitHub Issue with label `question`
- **Architecture decisions:** Check `docs/` folder
