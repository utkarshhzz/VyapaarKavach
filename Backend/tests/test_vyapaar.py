"""
Unit and Integration tests for Vyapaar Kavach endpoints:
- Disputes & EXCEPTIONS_V1 Deterministic Policy Engine
- Edge NLP (ONNX SLM) Claim Parser
- Transactional Outbox & eBPF Telemetry
- Groth16 ZK-SNARK Fraud Proof Syndication
- Cryptographic Governance Audit Export
"""
import pytest
from fastapi.testclient import TestClient
from main import app
from app.db.vyapaar_models import init_db

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    init_db()

@pytest.fixture
def client():
    return TestClient(app)

# ── 1. Disputes & State Machine Tests ─────────────────────────────────────────

def test_disputes_dashboard(client):
    response = client.get("/api/v1/vyapaar/disputes/dashboard?tenant_id=demo-merchant-1")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "stats" in data
    assert data["stats"]["total_transactions"] >= 0

def test_get_payments(client):
    response = client.get("/api/v1/vyapaar/disputes/payments?tenant_id=demo-merchant-1")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert isinstance(data["payments"], list)
    assert len(data["payments"]) > 0

def test_create_refund_intent(client):
    payload = {
        "payment_id": "TXN2024001",
        "amount_paise": 85000,
        "claim_text": "Item damaged in transit, requesting refund",
        "extracted_intent": "REFUND",
        "tenant_id": "demo-merchant-1"
    }
    response = client.post("/api/v1/vyapaar/disputes/refunds/create", json=payload)
    assert response.status_code in (200, 201)
    data = response.json()
    assert data["success"] is True
    assert "refund_intent" in data
    assert data["refund_intent"]["amount_paise"] == 85000

def test_webhook_reconciliation(client):
    response = client.post("/api/v1/vyapaar/disputes/payments/TXN2024002/webhook-reconcile?tenant_id=demo-merchant-1")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["new_verification_state"] == "VERIFIED"
    assert data["intents_unlocked"] is True

# ── 2. Edge NLP Claim Parser Tests ───────────────────────────────────────────

def test_claim_parser_hinglish(client):
    payload = {
        "raw_text": "Bhai maine 325 rupaye paytm se bhej diye the par order cancel dikha raha hai ref TXN2024002",
        "channel": "WHATSAPP",
        "tenant_id": "demo-merchant-1"
    }
    response = client.post("/api/v1/vyapaar/claims/parse", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "privacy_guarantee" in data
    assert data["privacy_guarantee"]["raw_text_stored"] is False
    assert data["privacy_guarantee"]["compliance"] == "DPDP_ACT_2023_COMPLIANT"

    extraction = data["extraction"]
    assert extraction["intent"] in ("refund", "double_debit", "status_inquiry", "unknown")
    assert extraction["extracted_ref"] == "TXN2024002"
    assert extraction["processing_location"] == "DEVICE_LOCAL"

def test_claim_parser_english(client):
    payload = {
        "raw_text": "I was charged twice for 500 rupees. Transaction ID is TXN2024005. Please refund immediately!",
        "channel": "SMS",
        "tenant_id": "demo-merchant-1"
    }
    response = client.post("/api/v1/vyapaar/claims/parse", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    extraction = data["extraction"]
    assert extraction["urgency"] == "high"
    assert extraction["extracted_ref"] == "TXN2024005"

# ── 3. Transactional Outbox & eBPF Telemetry Tests ─────────────────────────────

def test_outbox_simulate_worker_run(client):
    response = client.post("/api/v1/vyapaar/outbox/simulate-worker-run")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "jobs_processed" in data

def test_ebpf_telemetry_status(client):
    response = client.get("/api/v1/vyapaar/outbox/ebpf-status")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "ebpf" in data
    assert data["ebpf"]["enabled"] is True
    assert "kernel_version" in data["ebpf"]

# ── 4. ZK-SNARK Fraud Syndication Tests ───────────────────────────────────────

def test_zk_proof_generation_and_verification(client):
    gen_payload = {
        "tenant_id": "demo-merchant-1",
        "anomaly_type": "DISPUTE_ANOMALY",
        "threshold": 0.1,  # Set lower threshold to guarantee proof generation
        "syndicate_to_ondc": True
    }
    gen_res = client.post("/api/v1/vyapaar/zk/generate", json=gen_payload)
    assert gen_res.status_code == 200
    gen_data = gen_res.json()
    assert gen_data["success"] is True
    assert "proof_id" in gen_data
    assert "public_proof" in gen_data
    proof_id = gen_data["proof_id"]

    # Verify proof via verify endpoint
    verify_payload = {
        "proof_id": proof_id,
        "verification_inputs": {
            "proof_vector": gen_data["public_proof"]["proof_vector"]
        }
    }
    verify_res = client.post("/api/v1/vyapaar/zk/verify", json=verify_payload)
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert verify_data["success"] is True
    assert verify_data["verified"] is True

# ── 5. Cryptographic Governance Audit Export Tests ────────────────────────────

def test_audit_export_json(client):
    response = client.get("/api/v1/vyapaar/audit/export/json?tenant_id=demo-merchant-1")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "packet" in data
    assert "sha256_hash" in data
    packet = data["packet"]
    assert "governance_audit_logs" in packet
    assert "refund_intents" in packet
    assert packet["hash_algorithm"] == "SHA-256"
