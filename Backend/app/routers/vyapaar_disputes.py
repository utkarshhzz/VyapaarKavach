"""
Vyapaar Kavach — Disputes Router
Deterministic state machine for payment exception resolution.
Implements EXCEPTIONS_V1 policy engine.
"""
import uuid
import hashlib
import json
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List

from app.db.vyapaar_models import (
    get_db, get_all_payments, get_all_refund_intents,
    get_dashboard_stats, get_audit_logs
)

router = APIRouter(prefix="/vyapaar/disputes", tags=["Vyapaar Kavach - Disputes"])

DEMO_TENANT = "demo-merchant-1"


# ── Schemas ───────────────────────────────────────────────────────────────────

class CreateRefundIntentRequest(BaseModel):
    payment_id: str
    amount_paise: int
    claim_text: Optional[str] = None
    extracted_intent: Optional[str] = None
    tenant_id: str = DEMO_TENANT


class UpdateRefundStatusRequest(BaseModel):
    status: str
    reason: Optional[str] = None
    actor: str = "MERCHANT"


# ── EXCEPTIONS_V1 Policy Engine ──────────────────────────────────────────────

POLICY_ENGINE = {
    # (payment_status, verification_state) -> (verdict, allowed_actions)
    ("SUCCESS", "VERIFIED"): ("EXCEPTIONS_V1_REFUND_ELIGIBLE", ["APPROVE_REFUND", "REJECT_REFUND"]),
    ("PENDING", "SUBMISSION_UNKNOWN"): ("EXCEPTIONS_V1_TIMEOUT_LOCK", ["WAIT_RECONCILE"]),
    ("DISPUTED", "CONFLICTED"): ("EXCEPTIONS_V1_CONFLICTED", ["ESCALATE", "MANUAL_REVIEW"]),
    ("FAILED", "UNVERIFIED"): ("EXCEPTIONS_V1_NO_CHARGE", ["CLOSE_CLAIM"]),
    ("SUCCESS", "UNVERIFIED"): ("EXCEPTIONS_V1_PENDING_VERIFICATION", ["TRIGGER_WEBHOOK"]),
    ("PENDING", "UNVERIFIED"): ("EXCEPTIONS_V1_AWAIT_SETTLEMENT", ["WAIT"]),
}


def evaluate_policy(payment_status: str, verification_state: str) -> dict:
    key = (payment_status, verification_state)
    if key in POLICY_ENGINE:
        verdict, actions = POLICY_ENGINE[key]
        return {"verdict": verdict, "allowed_actions": actions, "deterministic": True}
    return {
        "verdict": "EXCEPTIONS_V1_UNSUPPORTED_STATE",
        "allowed_actions": ["MANUAL_REVIEW"],
        "deterministic": False
    }


def append_audit_log(conn, event_type: str, entity_type: str, entity_id: str,
                     tenant_id: str, old_state: str, new_state: str,
                     conflict_reason: str = None, actor: str = "DB_TRIGGER"):
    """Append-only audit log — simulates PL/pgSQL trigger behavior."""
    payload = json.dumps({
        "event": event_type, "entity": entity_id,
        "old": old_state, "new": new_state, "ts": datetime.now(timezone.utc).isoformat()
    }, sort_keys=True)
    sha = hashlib.sha256(payload.encode()).hexdigest()
    conn.execute("""INSERT INTO governance_audit_logs VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'))""",
                 (str(uuid.uuid4()), event_type, entity_type, entity_id,
                  tenant_id, old_state, new_state, conflict_reason, actor, sha))


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/dashboard")
async def get_dashboard(tenant_id: str = Query(DEMO_TENANT)):
    """Main merchant dashboard stats."""
    stats = get_dashboard_stats(tenant_id)
    return {"success": True, "tenant_id": tenant_id, "stats": stats}


@router.get("/payments")
async def list_payments(tenant_id: str = Query(DEMO_TENANT)):
    """List all payments for a merchant."""
    payments = get_all_payments(tenant_id)
    return {"success": True, "count": len(payments), "payments": payments}


@router.get("/refunds")
async def list_refunds(tenant_id: str = Query(DEMO_TENANT)):
    """List all refund intents with policy verdicts."""
    refunds = get_all_refund_intents(tenant_id)
    return {"success": True, "count": len(refunds), "refund_intents": refunds}


@router.post("/refunds/create")
async def create_refund_intent(req: CreateRefundIntentRequest):
    """
    Create a refund intent atomically.
    Implements idempotency key to prevent double-spending.
    """
    conn = get_db()
    try:
        # Fetch payment (support both internal id e.g. pay-001 and transaction_ref e.g. TXN2024001)
        payment = conn.execute(
            "SELECT * FROM payments WHERE (id=? OR transaction_ref=?) AND tenant_id=?",
            (req.payment_id, req.payment_id, req.tenant_id)
        ).fetchone()
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found or access denied")

        payment = dict(payment)

        # Evaluate policy
        policy = evaluate_policy(payment["payment_status"], payment["verification_state"])

        # Check for existing active intent (idempotency based on canonical payment id)
        idempotency_key = hashlib.sha256(
            f"{payment['id']}:{req.amount_paise}:{req.tenant_id}".encode()
        ).hexdigest()[:24]

        existing = conn.execute(
            "SELECT * FROM refund_intents WHERE idempotency_key=?", (idempotency_key,)
        ).fetchone()
        if existing:
            return {
                "success": True,
                "idempotent": True,
                "refund_intent": dict(existing),
                "policy": policy,
                "message": "Existing intent returned (idempotent)"
            }

        # Determine initial status based on policy
        if policy.get("state_action") == "LOCK_DISALLOW_REFUND":
            initial_status = "SUBMISSION_UNKNOWN"
            conflict_reason = "Out-of-order state: SUBMISSION_UNKNOWN requires webhook confirmation"
        elif policy.get("state_action") == "MANUAL_RECONCILIATION_REQUIRED":
            initial_status = "CONFLICTED"
            conflict_reason = "Payment state conflict detected - manual review required"
        elif payment["verification_state"] == "SUBMISSION_UNKNOWN":
            initial_status = "SUBMISSION_UNKNOWN"
            conflict_reason = "Payment in SUBMISSION_UNKNOWN state - intent locked pending reconciliation"
        elif payment["verification_state"] == "CONFLICTED":
            initial_status = "CONFLICTED"
            conflict_reason = "Payment state conflict detected - manual review required"
        else:
            initial_status = "PENDING"
            conflict_reason = None

        intent_id = str(uuid.uuid4())

        conn.execute("""INSERT INTO refund_intents VALUES (
            ?,?,?,?,?,?,?,?,?,'MERCHANT',datetime('now'),datetime('now'),NULL
        )""", (
            intent_id, req.tenant_id, payment["id"], req.amount_paise,
            initial_status, policy["verdict"], idempotency_key,
            req.claim_text, req.extracted_intent
        ))

        # Append audit log (simulate DB trigger)
        append_audit_log(conn, "REFUND_INTENT_CREATED", "refund_intents", intent_id,
                         req.tenant_id, "NULL", initial_status, conflict_reason, "MERCHANT")

        # If pending, create outbox job atomically in same transaction
        if initial_status == "PENDING":
            job_payload = json.dumps({
                "refund_intent_id": intent_id,
                "amount_paise": req.amount_paise,
                "payment_ref": payment["transaction_ref"],
                "provider": payment["provider"]
            })
            conn.execute("""INSERT INTO outbox_jobs VALUES (
                ?,?,'INITIATE_REFUND',?,'PENDING',NULL,NULL,0,NULL,datetime('now'),NULL
            )""", (str(uuid.uuid4()), intent_id, job_payload))

        if conflict_reason:
            append_audit_log(conn, "CONFLICT_DETECTED", "refund_intents", intent_id,
                             req.tenant_id, "PENDING", initial_status,
                             conflict_reason, "DB_TRIGGER")

        conn.commit()

        intent = dict(conn.execute(
            "SELECT * FROM refund_intents WHERE id=?", (intent_id,)
        ).fetchone())

        return {
            "success": True,
            "refund_intent": intent,
            "policy": policy,
            "message": f"Intent created with status: {initial_status}"
        }
    finally:
        conn.close()


@router.patch("/refunds/{intent_id}/status")
async def update_refund_status(intent_id: str, req: UpdateRefundStatusRequest,
                               tenant_id: str = Query(DEMO_TENANT)):
    """
    Update refund intent status.
    SUBMISSION_UNKNOWN and CONFLICTED states require manual unlock.
    """
    VALID_TRANSITIONS = {
        "DRAFT": ["PENDING", "REJECTED"],
        "PENDING": ["APPROVED", "REJECTED", "SUBMISSION_UNKNOWN"],
        "SUBMISSION_UNKNOWN": ["PENDING", "CONFLICTED"],  # Only after reconciliation
        "CONFLICTED": ["PENDING", "REJECTED"],            # Only after manual review
        "APPROVED": ["COMPLETED", "FAILED"],
        "FAILED": ["PENDING"],
    }

    conn = get_db()
    try:
        intent = conn.execute(
            "SELECT * FROM refund_intents WHERE id=? AND tenant_id=?",
            (intent_id, tenant_id)
        ).fetchone()
        if not intent:
            raise HTTPException(status_code=404, detail="Refund intent not found")

        intent = dict(intent)
        current = intent["status"]
        allowed = VALID_TRANSITIONS.get(current, [])

        if req.status not in allowed:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid transition: {current} -> {req.status}. Allowed: {allowed}"
            )

        conn.execute(
            "UPDATE refund_intents SET status=?, resolved_at=datetime('now') WHERE id=?",
            (req.status, intent_id)
        )

        append_audit_log(conn, "STATUS_TRANSITION", "refund_intents", intent_id,
                         tenant_id, current, req.status, req.reason, req.actor)
        conn.commit()

        return {
            "success": True,
            "intent_id": intent_id,
            "transition": f"{current} → {req.status}",
            "message": "Status updated and audit log appended"
        }
    finally:
        conn.close()


@router.post("/payments/{payment_id}/webhook-reconcile")
async def simulate_webhook_reconcile(payment_id: str, tenant_id: str = Query(DEMO_TENANT)):
    """
    Simulate receiving a late webhook to resolve SUBMISSION_UNKNOWN state.
    This is the deterministic reconciliation endpoint.
    """
    conn = get_db()
    try:
        payment = conn.execute(
            "SELECT * FROM payments WHERE (id=? OR transaction_ref=?) AND tenant_id=?",
            (payment_id, payment_id, tenant_id)
        ).fetchone()
        if not payment:
            raise HTTPException(404, "Payment not found")

        payment = dict(payment)
        actual_payment_id = payment["id"]
        old_state = payment["verification_state"]

        # Simulate webhook resolution
        new_verification = "VERIFIED"
        conn.execute(
            "UPDATE payments SET verification_state=?, payment_status='SUCCESS', updated_at=datetime('now') WHERE id=?",
            (new_verification, actual_payment_id)
        )

        # Unlock any SUBMISSION_UNKNOWN intents for this payment
        conn.execute(
            "UPDATE refund_intents SET status='PENDING' WHERE payment_id=? AND status='SUBMISSION_UNKNOWN'",
            (actual_payment_id,)
        )

        append_audit_log(conn, "WEBHOOK_RECONCILE", "payments", actual_payment_id,
                         tenant_id, old_state, new_verification,
                         "Late webhook received - state resolved", "WEBHOOK_WORKER")
        conn.commit()

        return {
            "success": True,
            "payment_id": actual_payment_id,
            "reference_id": payment.get("reference_id"),
            "old_verification_state": old_state,
            "new_verification_state": new_verification,
            "intents_unlocked": True,
            "message": "SUBMISSION_UNKNOWN resolved via webhook reconciliation"
        }
    finally:
        conn.close()


@router.get("/audit-logs")
async def get_audit_logs_endpoint(tenant_id: str = Query(DEMO_TENANT), limit: int = 50):
    """Fetch append-only governance audit logs."""
    logs = get_audit_logs(tenant_id, limit)
    return {"success": True, "count": len(logs), "logs": logs}


@router.get("/policy-evaluate")
async def evaluate_policy_endpoint(payment_status: str, verification_state: str):
    """Evaluate EXCEPTIONS_V1 policy for given payment states."""
    result = evaluate_policy(payment_status, verification_state)
    return {
        "success": True,
        "payment_status": payment_status,
        "verification_state": verification_state,
        "policy_result": result
    }
