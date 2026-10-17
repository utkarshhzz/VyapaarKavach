# 🌐 Vyapaar Kavach — ONDC Beckn Protocol Integration

> **Decentralized Exception Handling, Issue & Grievance Protocol (IGM), and ZK-SNARK Risk Syndication**

---

## 1. Overview

In the Open Network for Digital Commerce (ONDC), transactions span autonomous Buyer Apps (BAP) and Seller Apps (BPP) orchestrated over the Beckn protocol. When an exception occurs (e.g. delivery failure, payment mismatch, return request):
1. The Buyer App dispatches an `issue` API call.
2. The Seller App must respond synchronously with `on_issue` and asynchronously resolve the problem via `on_issue_status`.
3. Out-of-order delivery of webhooks between payment gateways and Beckn network gateways often traps small merchants into conflicting refund states.

Vyapaar Kavach serves as the **Deterministic Exception Layer** sitting directly between the Seller App (BPP) and the Beckn Gateway.

---

## 2. Beckn Issue & Grievance Flow

```
 Buyer App (BAP)               ONDC Gateway               Vyapaar Kavach (BPP)
      │                             │                             │
      │ ── 1. POST /issue ─────────►│                             │
      │    (Claim payload)          │ ── 2. POST /issue ─────────►│
      │                             │                             │ ◄── 3. Parse with Edge SLM
      │                             │                             │     (Extract Intent & Ref)
      │                             │                             │
      │                             │ ◄── 4. POST /on_issue ──────│ ◄── 5. Deterministic Policy Check
      │                             │    (ACK + Issue ID)         │     (EXCEPTIONS_V1)
      │ ◄── 6. POST /on_issue ──────│                             │
      │                             │                             │
      │                             │                             │ ◄── 7. Transactional Outbox
      │                             │                             │     (Atomic Gateway Refund)
      │                             │                             │
      │                             │ ◄── 8. POST /on_issue_status│
      │                             │    (Refund Confirmed)       │
      │ ◄── 9. POST /on_issue_status│                             │
```

---

## 3. Resolving the Webhook Dilemma

When the payment gateway has not confirmed the customer's payment yet (e.g. UPI 24-hour timeout), standard BPPs either:
1. Immediately issue a refund $\rightarrow$ **Vulnerable to double payout if the customer's initial payment failed**.
2. Immediately deny the refund $\rightarrow$ **High grievance escalation risk on ONDC**.

### Vyapaar Kavach's Solution:
- Transitions the dispute into `SUBMISSION_UNKNOWN`.
- Emits an ONDC Beckn `on_issue_status` with `status: "PROCESSING_RECONCILIATION"`.
- Activates an automated lease job in the Transactional Outbox that polls the gateway bank RRN.
- Once the webhook arrives, deterministically unlocks the intent into `PENDING` $\rightarrow$ `APPROVED` $\rightarrow$ `COMPLETED` without manual merchant intervention.

---

## 4. Privacy-Preserving Inter-Merchant Risk Syndication

Coordinated fraud rings move rapidly between ONDC merchant stores:
1. **Merchant A** detects a cluster of spoofed refund requests.
2. Under India's **Digital Personal Data Protection (DPDP) Act 2023**, Merchant A cannot share customer phone numbers or order histories with Merchant B.
3. Merchant A uses Vyapaar Kavach's `/api/v1/vyapaar/zk/generate` to produce a Groth16 zero-knowledge SNARK proof.
4. The proof is syndicated to the decentralized network registry.
5. **Merchant B** receives the proof and verifies it via `/api/v1/vyapaar/zk/verify` in $<15\text{ ms}$. Merchant B's policy engine adjusts its dispute threshold automatically without ever seeing Merchant A's customers or sales volumes.
