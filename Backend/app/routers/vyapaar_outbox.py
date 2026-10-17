"""
Vyapaar Kavach — Outbox Worker Router
Transactional Outbox Pattern for bulletproof async financial mutations.
Prevents double-payout via atomic leasing.
"""
import uuid
import json
import asyncio
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Query
from app.db.vyapaar_models import get_db, get_outbox_jobs

router = APIRouter(prefix="/vyapaar/outbox", tags=["Vyapaar Kavach - Outbox"])

LEASE_DURATION_SECONDS = 30


@router.get("/jobs")
async def list_outbox_jobs(limit: int = 20):
    """List all outbox jobs with their statuses."""
    jobs = get_outbox_jobs(limit)
    pending = [j for j in jobs if j["status"] == "PENDING"]
    leased = [j for j in jobs if j["status"] == "LEASED"]
    completed = [j for j in jobs if j["status"] == "COMPLETED"]
    failed = [j for j in jobs if j["status"] in ("FAILED", "DEAD_LETTER")]

    return {
        "success": True,
        "summary": {
            "total": len(jobs),
            "pending": len(pending),
            "leased": len(leased),
            "completed": len(completed),
            "failed_or_dead": len(failed)
        },
        "jobs": jobs
    }


@router.post("/jobs/{job_id}/lease")
async def lease_job(job_id: str, worker_id: str = Query("worker-1")):
    """
    Atomically lease a job to a worker.
    Uses UPDATE...WHERE to prevent concurrent double-lease.
    This simulates the SELECT FOR UPDATE SKIP LOCKED pattern.
    """
    conn = get_db()
    try:
        # Atomic lease acquisition — only succeeds if job is PENDING
        lease_id = str(uuid.uuid4())
        expires_at = (datetime.now(timezone.utc) + timedelta(seconds=LEASE_DURATION_SECONDS)).isoformat()

        result = conn.execute("""
            UPDATE outbox_jobs
            SET status='LEASED', lease_id=?, lease_expires_at=?, attempts=attempts+1
            WHERE id=? AND status='PENDING'
        """, (lease_id, expires_at, job_id))
        conn.commit()

        if result.rowcount == 0:
            return {
                "success": False,
                "message": "Job not available (already leased or completed)",
                "job_id": job_id
            }

        job = dict(conn.execute("SELECT * FROM outbox_jobs WHERE id=?", (job_id,)).fetchone())
        return {
            "success": True,
            "leased": True,
            "lease_id": lease_id,
            "expires_at": expires_at,
            "job": job,
            "message": f"Job leased to {worker_id} for {LEASE_DURATION_SECONDS}s"
        }
    finally:
        conn.close()


@router.post("/jobs/{job_id}/complete")
async def complete_job(job_id: str, lease_id: str = Query(...)):
    """
    Mark a job as completed (only valid lease holder can complete).
    Simulates provider acknowledgment.
    """
    conn = get_db()
    try:
        result = conn.execute("""
            UPDATE outbox_jobs SET status='COMPLETED', executed_at=datetime('now')
            WHERE id=? AND lease_id=? AND status='LEASED'
        """, (job_id, lease_id))
        conn.commit()

        if result.rowcount == 0:
            return {"success": False, "message": "Invalid lease or job not in LEASED state"}

        # Also update the refund intent status
        job = dict(conn.execute("SELECT * FROM outbox_jobs WHERE id=?", (job_id,)).fetchone())
        conn.execute(
            "UPDATE refund_intents SET status='APPROVED', resolved_at=datetime('now') WHERE id=?",
            (job["refund_intent_id"],)
        )
        conn.commit()

        return {
            "success": True,
            "job_id": job_id,
            "status": "COMPLETED",
            "message": "Refund processed by payment provider"
        }
    finally:
        conn.close()


@router.post("/jobs/{job_id}/fail")
async def fail_job(job_id: str, lease_id: str = Query(...),
                   error: str = Query("Provider timeout")):
    """Fail a job and increment retry counter. After 3 failures -> DEAD_LETTER."""
    conn = get_db()
    try:
        job = conn.execute("SELECT * FROM outbox_jobs WHERE id=? AND lease_id=?",
                           (job_id, lease_id)).fetchone()
        if not job:
            return {"success": False, "message": "Invalid lease or job not found"}

        job = dict(job)
        attempts = job["attempts"]
        new_status = "DEAD_LETTER" if attempts >= 3 else "PENDING"

        conn.execute("""
            UPDATE outbox_jobs
            SET status=?, last_error=?, lease_id=NULL, lease_expires_at=NULL
            WHERE id=?
        """, (new_status, error, job_id))
        conn.commit()

        return {
            "success": True,
            "job_id": job_id,
            "new_status": new_status,
            "attempts": attempts,
            "message": f"Job {'moved to DEAD_LETTER' if new_status == 'DEAD_LETTER' else 'queued for retry'}"
        }
    finally:
        conn.close()


@router.post("/simulate-worker-run")
async def simulate_worker_run():
    """
    Simulate a complete outbox worker cycle.
    Demonstrates the transactional outbox pattern in action.
    Includes simulated eBPF monitoring events.
    """
    conn = get_db()
    try:
        # Fetch all pending jobs
        pending = conn.execute(
            "SELECT oj.*, ri.tenant_id FROM outbox_jobs oj "
            "JOIN refund_intents ri ON oj.refund_intent_id=ri.id "
            "WHERE oj.status='PENDING' LIMIT 5"
        ).fetchall()

        results = []
        ebpf_events = []

        for job in pending:
            job = dict(job)
            lease_id = str(uuid.uuid4())
            expires_at = (datetime.now(timezone.utc) + timedelta(seconds=30)).isoformat()

            # Atomic lease
            leased = conn.execute("""
                UPDATE outbox_jobs SET status='LEASED', lease_id=?, lease_expires_at=?, attempts=attempts+1
                WHERE id=? AND status='PENDING'
            """, (lease_id, expires_at, job["id"])).rowcount > 0
            conn.commit()

            if not leased:
                results.append({"job_id": job["id"], "result": "SKIPPED_CONCURRENT_LEASE"})
                continue

            # Simulate eBPF syscall monitoring
            ebpf_events.append({
                "event": "NETWORK_SYSCALL",
                "pid": 12345,
                "process": "outbox_worker",
                "destination": "api.razorpay.com:443",
                "whitelisted": True,
                "action": "ALLOW",
                "timestamp": datetime.now(timezone.utc).isoformat()
            })

            # Simulate provider call (90% success in demo)
            import random
            if random.random() > 0.1:
                conn.execute("""
                    UPDATE outbox_jobs SET status='COMPLETED', executed_at=datetime('now') WHERE id=?
                """, (job["id"],))
                conn.execute(
                    "UPDATE refund_intents SET status='APPROVED' WHERE id=?",
                    (job["refund_intent_id"],)
                )
                results.append({"job_id": job["id"], "result": "COMPLETED", "lease_id": lease_id})
            else:
                attempts = job["attempts"] + 1
                new_status = "DEAD_LETTER" if attempts >= 3 else "PENDING"
                conn.execute("""
                    UPDATE outbox_jobs SET status=?, last_error='Simulated provider timeout',
                    lease_id=NULL WHERE id=?
                """, (new_status, job["id"]))
                results.append({"job_id": job["id"], "result": new_status})

            conn.commit()

        return {
            "success": True,
            "worker_cycle": "COMPLETE",
            "jobs_processed": len(results),
            "results": results,
            "ebpf_monitoring": {
                "enabled": True,
                "events_captured": len(ebpf_events),
                "unauthorized_attempts": 0,
                "all_calls_whitelisted": True,
                "events": ebpf_events
            },
            "double_spend_prevention": "ACTIVE - Atomic lease prevents concurrent processing"
        }
    finally:
        conn.close()


@router.get("/ebpf-status")
async def get_ebpf_status():
    """Get simulated eBPF monitoring status for outbox workers."""
    return {
        "success": True,
        "ebpf": {
            "enabled": True,
            "kernel_version": "6.6.0-gentoo",
            "probes_attached": [
                {"name": "sys_connect_probe", "process": "outbox_worker", "status": "ACTIVE"},
                {"name": "sys_sendto_probe", "process": "outbox_worker", "status": "ACTIVE"},
                {"name": "tcp_connect_probe", "process": "outbox_worker", "status": "ACTIVE"}
            ],
            "whitelist": [
                "api.razorpay.com:443",
                "api.paytm.com:443",
                "api.phonepe.com:443",
                "api.ondc.org:443"
            ],
            "blocked_attempts_24h": 0,
            "total_calls_monitored_24h": 847,
            "last_audit": datetime.now(timezone.utc).isoformat()
        }
    }
