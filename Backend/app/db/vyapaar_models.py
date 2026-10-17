"""
Vyapaar Kavach — Database Models
Deterministic state machine entities for merchant exception resolution.
Uses SQLite for demo; PostgreSQL-ready schema.
"""
import sqlite3
import hashlib
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).parent.parent.parent / "vyapaar_kavach.db"


def get_db():
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Initialize all Vyapaar Kavach tables."""
    conn = get_db()
    c = conn.cursor()

    # ── Tenants (Merchants) ────────────────────────────────────────────────────
    c.execute("""
    CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        gstin TEXT,
        contact_email TEXT,
        contact_phone TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        is_active INTEGER DEFAULT 1
    )
    """)

    # ── Payments (Transaction Ledger) ──────────────────────────────────────────
    c.execute("""
    CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        transaction_ref TEXT NOT NULL UNIQUE,
        amount_paise INTEGER NOT NULL,
        payment_status TEXT NOT NULL DEFAULT 'PENDING',
        verification_state TEXT NOT NULL DEFAULT 'UNVERIFIED',
        provider TEXT DEFAULT 'RAZORPAY',
        customer_name TEXT,
        customer_phone_hash TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        CHECK (payment_status IN ('PENDING','SUCCESS','FAILED','REFUNDED','DISPUTED')),
        CHECK (verification_state IN ('UNVERIFIED','VERIFIED','CONFLICTED','SUBMISSION_UNKNOWN'))
    )
    """)

    # ── Provider Events (Webhook events) ───────────────────────────────────────
    c.execute("""
    CREATE TABLE IF NOT EXISTS provider_events (
        id TEXT PRIMARY KEY,
        payment_id TEXT NOT NULL REFERENCES payments(id),
        event_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        received_at TEXT DEFAULT (datetime('now')),
        processed INTEGER DEFAULT 0
    )
    """)

    # ── Refund Intents (State Machine Core) ────────────────────────────────────
    c.execute("""
    CREATE TABLE IF NOT EXISTS refund_intents (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        payment_id TEXT NOT NULL REFERENCES payments(id),
        amount_paise INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'DRAFT',
        policy_verdict TEXT,
        idempotency_key TEXT NOT NULL UNIQUE,
        claim_text TEXT,
        extracted_intent TEXT,
        created_by TEXT DEFAULT 'MERCHANT',
        created_at TEXT DEFAULT (datetime('now')),
        submitted_at TEXT,
        resolved_at TEXT,
        CHECK (status IN ('DRAFT','PENDING','SUBMISSION_UNKNOWN','APPROVED','REJECTED','COMPLETED','CONFLICTED'))
    )
    """)

    # ── Outbox Jobs (Transactional Outbox Pattern) ─────────────────────────────
    c.execute("""
    CREATE TABLE IF NOT EXISTS outbox_jobs (
        id TEXT PRIMARY KEY,
        refund_intent_id TEXT NOT NULL REFERENCES refund_intents(id),
        job_type TEXT NOT NULL DEFAULT 'INITIATE_REFUND',
        payload TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        lease_id TEXT,
        lease_expires_at TEXT,
        attempts INTEGER DEFAULT 0,
        last_error TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        executed_at TEXT,
        CHECK (status IN ('PENDING','LEASED','COMPLETED','FAILED','DEAD_LETTER'))
    )
    """)

    # ── Governance Audit Logs (Append-only, trigger-populated) ────────────────
    c.execute("""
    CREATE TABLE IF NOT EXISTS governance_audit_logs (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        tenant_id TEXT,
        old_state TEXT,
        new_state TEXT,
        conflict_reason TEXT,
        actor TEXT DEFAULT 'SYSTEM',
        sha256_hash TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
    )
    """)

    # ── ZK Fraud Proofs (Privacy-preserving fraud syndication) ────────────────
    c.execute("""
    CREATE TABLE IF NOT EXISTS zk_fraud_proofs (
        id TEXT PRIMARY KEY,
        proof_type TEXT NOT NULL DEFAULT 'DISPUTE_ANOMALY',
        issuer_tenant_hash TEXT NOT NULL,
        anomaly_score REAL NOT NULL,
        cluster_size INTEGER NOT NULL,
        proof_vector TEXT NOT NULL,
        public_inputs TEXT NOT NULL,
        verification_hash TEXT NOT NULL,
        valid_until TEXT,
        is_syndicated INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
    )
    """)

    # ── Claims (Unstructured customer claims) ─────────────────────────────────
    c.execute("""
    CREATE TABLE IF NOT EXISTS claims (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        payment_id TEXT,
        raw_text TEXT NOT NULL,
        source TEXT DEFAULT 'WHATSAPP',
        extracted_intent TEXT,
        extracted_amount INTEGER,
        extracted_ref TEXT,
        confidence REAL DEFAULT 0.0,
        processed_locally INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
    )
    """)

    # ── Seed demo merchant ────────────────────────────────────────────────────
    c.execute("SELECT COUNT(*) FROM tenants WHERE id='demo-merchant-1'")
    if c.fetchone()[0] == 0:
        _seed_demo_data(c)

    conn.commit()
    conn.close()
    print("[Vyapaar Kavach] Database initialized successfully.")


def _seed_demo_data(c):
    """Seed realistic demo data for presentation."""
    import random

    # Demo merchant
    c.execute("""INSERT INTO tenants VALUES (
        'demo-merchant-1','Sharma Kirana Store','27AAPFU0939F1ZV',
        'sharma@kirana.in','+919876543210',datetime('now'),1
    )""")
    c.execute("""INSERT INTO tenants VALUES (
        'demo-merchant-2','Patel Electronics','24AAACP1234A1ZS',
        'patel@electronics.in','+919876543211',datetime('now'),1
    )""")

    # Demo payments
    payments = [
        ('pay-001','demo-merchant-1','TXN2024001',85000,'SUCCESS','VERIFIED','RAZORPAY','Ravi Kumar'),
        ('pay-002','demo-merchant-1','TXN2024002',32500,'PENDING','SUBMISSION_UNKNOWN','PAYTM','Priya Sharma'),
        ('pay-003','demo-merchant-1','TXN2024003',120000,'DISPUTED','CONFLICTED','PHONEPE','Amit Singh'),
        ('pay-004','demo-merchant-1','TXN2024004',45000,'SUCCESS','VERIFIED','RAZORPAY','Sunita Devi'),
        ('pay-005','demo-merchant-1','TXN2024005',67000,'FAILED','UNVERIFIED','PAYTM','Rajesh Gupta'),
        ('pay-006','demo-merchant-2','TXN2024006',250000,'SUCCESS','VERIFIED','RAZORPAY','Neha Patel'),
        ('pay-007','demo-merchant-2','TXN2024007',89000,'DISPUTED','CONFLICTED','PHONEPE','Vikram Mehta'),
    ]
    for p in payments:
        pid, tid, ref, amount, pstatus, vstate, provider, cname = p
        phone_hash = hashlib.sha256(f"+91{random.randint(7000000000,9999999999)}".encode()).hexdigest()[:16]
        c.execute("""INSERT INTO payments VALUES (?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))""",
                  (pid, tid, ref, amount, pstatus, vstate, provider, cname, phone_hash))

    # Demo refund intents
    refunds = [
        ('ref-001','demo-merchant-1','pay-002',32500,'SUBMISSION_UNKNOWN',
         'EXCEPTIONS_V1_TIMEOUT','IDEM-001','Maine payment kiya but order nahi aaya',
         '{"intent":"refund","amount":32500,"ref":"TXN2024002"}'),
        ('ref-002','demo-merchant-1','pay-003',120000,'CONFLICTED',
         'EXCEPTIONS_V1_CONFLICTED','IDEM-002','Double charge ho gaya mujhe',
         '{"intent":"refund","amount":120000,"ref":"TXN2024003"}'),
        ('ref-003','demo-merchant-1','pay-004',45000,'COMPLETED',
         'EXCEPTIONS_V1_APPROVED','IDEM-003','Refund request',
         '{"intent":"refund","amount":45000,"ref":"TXN2024004"}'),
    ]
    for r in refunds:
        rid, tid, pid, amt, status, verdict, idem, claim, extracted = r
        c.execute("""INSERT INTO refund_intents VALUES (
            ?,?,?,?,?,?,?,?,?,
            'MERCHANT',datetime('now'),datetime('now'),NULL
        )""", (rid, tid, pid, amt, status, verdict, idem, claim, extracted))

    # Demo outbox jobs
    c.execute("""INSERT INTO outbox_jobs VALUES (
        'job-001','ref-001','INITIATE_REFUND',
        '{"amount":32500,"provider":"PAYTM","ref":"TXN2024002"}',
        'PENDING',NULL,NULL,0,NULL,datetime('now'),NULL
    )""")
    c.execute("""INSERT INTO outbox_jobs VALUES (
        'job-002','ref-002','INITIATE_REFUND',
        '{"amount":120000,"provider":"PHONEPE","ref":"TXN2024003"}',
        'DEAD_LETTER',NULL,NULL,3,'Provider timeout after 3 attempts',datetime('now'),NULL
    )""")

    # Demo audit logs
    audit_events = [
        ('CONFLICTED_STATE_DETECTED','refund_intents','ref-002','demo-merchant-1',
         'PENDING','CONFLICTED','Concurrent refund submission detected'),
        ('SUBMISSION_UNKNOWN_LOCK','refund_intents','ref-001','demo-merchant-1',
         'PENDING','SUBMISSION_UNKNOWN','Webhook timeout - state locked'),
        ('OUTBOX_DEAD_LETTER','outbox_jobs','job-002','demo-merchant-1',
         'LEASED','DEAD_LETTER','Max retries exceeded'),
    ]
    for event in audit_events:
        etype, entity, eid, tid, old, new, reason = event
        payload = json.dumps({"event":etype,"entity_id":eid,"old":old,"new":new})
        sha = hashlib.sha256(payload.encode()).hexdigest()
        c.execute("""INSERT INTO governance_audit_logs VALUES (
            ?,?,?,?,?,?,?,?,'DB_TRIGGER',?,datetime('now')
        )""", (str(uuid.uuid4()), etype, entity, eid, tid, old, new, reason, sha))

    # Demo ZK fraud proofs
    proof_vec = json.dumps([0.82, 0.91, 0.77, 0.95, 0.88])
    pub_inputs = json.dumps({"cluster_size":3,"anomaly_threshold":0.75,"network":"ONDC-IN"})
    vhash = hashlib.sha256((proof_vec+pub_inputs).encode()).hexdigest()
    issuer_hash = hashlib.sha256("demo-merchant-2".encode()).hexdigest()[:32]
    c.execute("""INSERT INTO zk_fraud_proofs VALUES (
        'zkp-001','DISPUTE_ANOMALY',?,0.91,3,?,?,?,'2026-12-31',0,datetime('now')
    )""", (issuer_hash, proof_vec, pub_inputs, vhash))

    # Demo claims
    claims_data = [
        ('clm-001','demo-merchant-1','pay-002',
         'Bhai maine paytm se 325 rupaye bheje the kal raat ko. Order nahi aaya abhi tak.',
         'WHATSAPP','{"intent":"refund","amount":32500,"ref":"TXN2024002","urgency":"high"}',32500,'TXN2024002',0.89),
        ('clm-002','demo-merchant-1','pay-003',
         'Mere account se 1200 rupaye do baar kat gaye aaj. Please dekho.',
         'SMS','{"intent":"chargeback","amount":120000,"ref":"TXN2024003","urgency":"critical"}',120000,'TXN2024003',0.94),
    ]
    for clm in claims_data:
        cid, tid, pid, raw, source, extracted, amt, ref, conf = clm
        c.execute("""INSERT INTO claims VALUES (?,?,?,?,?,?,?,?,?,1,datetime('now'))""",
                  (cid, tid, pid, raw, source, extracted, amt, ref, conf))


def get_all_payments(tenant_id: str):
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM payments WHERE tenant_id=? ORDER BY created_at DESC", (tenant_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_all_refund_intents(tenant_id: str):
    conn = get_db()
    rows = conn.execute(
        "SELECT ri.*, p.transaction_ref, p.payment_status "
        "FROM refund_intents ri JOIN payments p ON ri.payment_id=p.id "
        "WHERE ri.tenant_id=? ORDER BY ri.created_at DESC", (tenant_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_audit_logs(tenant_id: str, limit: int = 50):
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM governance_audit_logs WHERE tenant_id=? ORDER BY created_at DESC LIMIT ?",
        (tenant_id, limit)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_outbox_jobs(limit: int = 20):
    conn = get_db()
    rows = conn.execute(
        "SELECT oj.*, ri.tenant_id, ri.status as intent_status "
        "FROM outbox_jobs oj JOIN refund_intents ri ON oj.refund_intent_id=ri.id "
        "ORDER BY oj.created_at DESC LIMIT ?", (limit,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_zk_proofs(limit: int = 10):
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM zk_fraud_proofs ORDER BY created_at DESC LIMIT ?", (limit,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_dashboard_stats(tenant_id: str):
    conn = get_db()
    total_txns = conn.execute("SELECT COUNT(*) FROM payments WHERE tenant_id=?", (tenant_id,)).fetchone()[0]
    disputed = conn.execute("SELECT COUNT(*) FROM payments WHERE tenant_id=? AND payment_status='DISPUTED'", (tenant_id,)).fetchone()[0]
    pending_refunds = conn.execute("SELECT COUNT(*) FROM refund_intents WHERE tenant_id=? AND status IN ('PENDING','SUBMISSION_UNKNOWN')", (tenant_id,)).fetchone()[0]
    total_refund_amt = conn.execute("SELECT SUM(amount_paise) FROM refund_intents WHERE tenant_id=? AND status='COMPLETED'", (tenant_id,)).fetchone()[0] or 0
    conflicted = conn.execute("SELECT COUNT(*) FROM refund_intents WHERE tenant_id=? AND status='CONFLICTED'", (tenant_id,)).fetchone()[0]
    zk_proofs = conn.execute("SELECT COUNT(*) FROM zk_fraud_proofs").fetchone()[0]
    conn.close()
    return {
        "total_transactions": total_txns,
        "disputed_count": disputed,
        "pending_refunds": pending_refunds,
        "total_refunded_paise": total_refund_amt,
        "conflicted_intents": conflicted,
        "zk_proofs_generated": zk_proofs,
        "risk_score": round((disputed + conflicted) / max(total_txns, 1) * 100, 2)
    }
