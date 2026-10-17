# 📡 Vyapaar Kavach — API Reference

Base URL: `http://localhost:8000/api/v1`

---

## 1. Exception Resolution & Disputes (`/vyapaar/disputes`)

### `GET /api/v1/vyapaar/disputes/dashboard`
Fetches real-time transaction summary, pending exceptions, and resolution velocity for a merchant tenant.
- **Query Parameters**:
  - `tenant_id` (string, optional, default: `"demo-merchant-1"`)
- **Response**:
  ```json
  {
    "success": true,
    "tenant_id": "demo-merchant-1",
    "stats": {
      "total_transactions": 7,
      "disputed_count": 2,
      "submission_unknown_count": 1,
      "verified_count": 4,
      "resolution_rate_pct": 71.4
    }
  }
  ```

### `GET /api/v1/vyapaar/disputes/payments`
Lists all payments and their current deterministic state.
- **Query Parameters**:
  - `tenant_id` (string, optional)
  - `status` (string, optional: `PENDING`, `SUCCESS`, `DISPUTED`, `FAILED`)

### `POST /api/v1/vyapaar/disputes/refunds/create`
Atomically creates a refund intent with idempotency guard.
- **Request Body**:
  ```json
  {
    "payment_id": "TXN2024001",
    "amount_paise": 85000,
    "claim_text": "Item damaged in transit, requesting refund",
    "extracted_intent": "REFUND",
    "tenant_id": "demo-merchant-1"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "idempotent": false,
    "refund_intent": {
      "id": "ref-uuid-1234",
      "payment_id": "pay-001",
      "amount_paise": 85000,
      "status": "PENDING"
    },
    "policy": {
      "verdict": "EXCEPTIONS_V1_APPROVED",
      "state_action": "ALLOW_OUTBOX_REFUND"
    }
  }
  ```

### `POST /api/v1/vyapaar/disputes/payments/{payment_id}/webhook-reconcile`
Deterministically resolves a `SUBMISSION_UNKNOWN` payment upon delayed webhook arrival.
- **Path Parameters**:
  - `payment_id`: Internal payment ID (`pay-001`) or transaction reference (`TXN2024001`)

---

## 2. Edge NLP Claim Parser (`/vyapaar/claims`)

### `POST /api/v1/vyapaar/claims/parse`
Simulates browser-local ONNX Small Language Model extraction.
- **Request Body**:
  ```json
  {
    "raw_text": "Bhai maine 325 rupaye paytm se bhej diye the par order cancel dikha raha hai ref TXN2024002",
    "channel": "WHATSAPP",
    "tenant_id": "demo-merchant-1"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "privacy_guarantee": {
      "raw_text_stored": false,
      "pii_uploaded": false,
      "processing": "EDGE_LOCAL_ONNX",
      "compliance": "DPDP_ACT_2023_COMPLIANT"
    },
    "extraction": {
      "intent": "refund",
      "amount_paise": 32500,
      "extracted_ref": "TXN2024002",
      "urgency": "high",
      "language": "hinglish",
      "confidence": 0.92,
      "processing_location": "DEVICE_LOCAL"
    }
  }
  ```

---

## 3. Transactional Outbox & eBPF Telemetry (`/vyapaar/outbox`)

### `GET /api/v1/vyapaar/outbox/jobs`
Lists pending, leased, completed, and dead-letter outbox jobs.

### `POST /api/v1/vyapaar/outbox/simulate-worker-run`
Simulates a scheduled background worker cycle with atomic lease acquisition.

### `GET /api/v1/vyapaar/outbox/ebpf-status`
Returns low-level kernel probe metrics, socket anomalies, and blocked concurrent double-refund attempts.

---

## 4. Groth16 Zero-Knowledge Fraud Syndication (`/vyapaar/zk`)

### `POST /api/v1/vyapaar/zk/generate`
Generates a zero-knowledge proof for a dispute cluster without revealing merchant identity or customer PII.
- **Request Body**:
  ```json
  {
    "tenant_id": "demo-merchant-1",
    "anomaly_type": "DISPUTE_ANOMALY",
    "threshold": 0.5,
    "syndicate_to_ondc": true
  }
  ```

### `POST /api/v1/vyapaar/zk/verify`
Verifies a generated proof via elliptic curve pairing checks.
- **Request Body**:
  ```json
  {
    "proof_id": "zk-proof-uuid",
    "verification_inputs": {
      "proof_vector": [0.4281, 0.9912, 0.1203, 0.7781, 0.3341]
    }
  }
  ```

---

## 5. Cryptographic Governance Audit Export (`/vyapaar/audit`)

### `GET /api/v1/vyapaar/audit/export/json`
Exports a tamper-evident audit packet with rolling SHA-256 integrity seal.
- **Query Parameters**:
  - `tenant_id` (string, optional)
- **Response**:
  ```json
  {
    "success": true,
    "sha256_hash": "a8f3b...829c",
    "packet": {
      "export_timestamp": "2026-10-17T07:15:12Z",
      "hash_algorithm": "SHA-256",
      "governance_audit_logs": [ ... ],
      "refund_intents": [ ... ]
    }
  }
  ```
