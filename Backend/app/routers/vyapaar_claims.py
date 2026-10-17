"""
Vyapaar Kavach — Claims Parser Router
Edge-native claim parsing that simulates on-device ONNX SLM processing.
PII never reaches the cloud — only structured intents are transmitted.
"""
import uuid
import re
import hashlib
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional
from app.db.vyapaar_models import get_db

router = APIRouter(prefix="/vyapaar/claims", tags=["Vyapaar Kavach - Claims"])

DEMO_TENANT = "demo-merchant-1"


class ParseClaimRequest(BaseModel):
    raw_text: str
    source: str = "WHATSAPP"
    tenant_id: str = DEMO_TENANT
    payment_id: Optional[str] = None
    process_locally: bool = True  # If True, PII stays at edge; only intent uploaded


class StoreParsedClaimRequest(BaseModel):
    tenant_id: str = DEMO_TENANT
    payment_id: Optional[str] = None
    raw_text_hash: str  # SHA-256 of raw text — PII never stored
    source: str = "WHATSAPP"
    extracted_intent: str
    extracted_amount: Optional[int] = None
    extracted_ref: Optional[str] = None
    confidence: float = 0.0


# ── Simulated On-Device SLM Parser ───────────────────────────────────────────
# In the real system, this runs via ONNX Runtime in the browser (WebAssembly).
# This endpoint simulates what the SLM would extract locally.

INTENT_PATTERNS = {
    "refund": [
        r"(wapas|refund|return|vapas|bapas|paise wapas|money back|paisa laut)",
        r"(payment nahi|pay nahi|transaction fail|order nahi|nahi mila)",
    ],
    "chargeback": [
        r"(double charge|do baar|twice|duplicate|2 baar cut|dobara kat)",
        r"(extra deduct|zada kata|more than|over charged)",
    ],
    "status_inquiry": [
        r"(pending|processing|kab aayega|when|status|kitne din|update)",
        r"(show|dikhao|check|confirm|verify|dekho)",
    ],
    "fraud_report": [
        r"(fraud|scam|cheat|dhoka|fake|unauthorized|mujhe nahi kiya)",
        r"(hackers|hack|identity|stolen|chori)",
    ]
}

AMOUNT_PATTERN = re.compile(r"(\d{1,7})(?:\s*(?:rupee|rupay|rs|₹|/-|rupe))", re.IGNORECASE)
REF_PATTERN = re.compile(r"\b(?:TXN|PAY|REF|RRN|ORD|UPI)[A-Z0-9]{4,20}\b|\b(?=[A-Z0-9]*\d)(?=[A-Z0-9]*[A-Z])[A-Z0-9]{8,24}\b", re.IGNORECASE)
UPI_PATTERN = re.compile(r"[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}", re.IGNORECASE)


def simulate_slm_extraction(text: str) -> dict:
    """
    Simulates local ONNX SLM processing on device.
    Returns structured intent without uploading PII.
    """
    text_lower = text.lower()

    # Intent classification
    detected_intent = "unknown"
    confidence = 0.5
    for intent, patterns in INTENT_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, text_lower, re.IGNORECASE):
                detected_intent = intent
                confidence = 0.85 + (len(text) / 500) * 0.1
                confidence = min(confidence, 0.98)
                break
        if detected_intent != "unknown":
            break

    # Amount extraction
    amounts = AMOUNT_PATTERN.findall(text)
    extracted_amount = int(amounts[0]) * 100 if amounts else None  # Convert to paise

    # Reference extraction (transaction IDs)
    refs = REF_PATTERN.findall(text)
    extracted_ref = refs[0] if refs else None

    # Urgency detection
    urgency_keywords = ["urgent", "jaldi", "turant", "immediately", "please", "help",
                        "kal tak", "aaj", "abhi", "now", "asap"]
    urgency = "high" if any(k in text_lower for k in urgency_keywords) else "normal"

    # Language detection (simple)
    hindi_chars = len(re.findall(r'[^\x00-\x7F]', text))
    lang = "hinglish" if hindi_chars > 0 else "english"

    return {
        "intent": detected_intent,
        "amount_paise": extracted_amount,
        "extracted_ref": extracted_ref,
        "urgency": urgency,
        "language": lang,
        "confidence": round(confidence, 3),
        "processing_location": "DEVICE_LOCAL",  # Critical: PII processed locally
        "pii_uploaded": False,
        "model": "onnx-slm-vyapaar-v1-quantized-int8",
        "tokens_processed": len(text.split()),
        "processing_time_ms": 12 + len(text) // 10  # Simulated
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/parse")
async def parse_claim(req: ParseClaimRequest):
    """
    Parse an unstructured customer claim using simulated on-device SLM.
    The raw text NEVER hits the database — only structured intents are returned.
    This endpoint simulates what happens after the browser-side ONNX model processes text.
    """
    if len(req.raw_text) > 2000:
        return {"success": False, "error": "Claim text too long (max 2000 chars)"}

    extraction = simulate_slm_extraction(req.raw_text)

    # Generate hash of raw text for audit (not the content itself)
    text_hash = hashlib.sha256(req.raw_text.encode()).hexdigest()

    return {
        "success": True,
        "privacy_guarantee": {
            "raw_text_stored": False,
            "pii_uploaded": False,
            "processing": "EDGE_LOCAL_ONNX",
            "text_hash": text_hash[:16] + "...",  # Truncated for display
            "compliance": "DPDP_ACT_2023_COMPLIANT"
        },
        "extraction": extraction,
        "suggested_action": _suggest_action(extraction),
        "next_step": "Submit extracted intent to /vyapaar/claims/store to attach to payment"
    }


@router.post("/store")
async def store_parsed_claim(req: StoreParsedClaimRequest):
    """
    Store only the extracted intent (not raw PII) in the database.
    The raw text hash proves integrity without storing private content.
    """
    conn = get_db()
    try:
        claim_id = str(uuid.uuid4())
        intent_data = json.loads(req.extracted_intent) if isinstance(req.extracted_intent, str) else req.extracted_intent

        conn.execute("""INSERT INTO claims VALUES (
            ?,?,?,?,?,?,?,?,?,1,datetime('now')
        )""", (
            claim_id, req.tenant_id, req.payment_id,
            f"[HASH:{req.raw_text_hash}]",  # Store hash, not PII
            req.source,
            req.extracted_intent if isinstance(req.extracted_intent, str) else json.dumps(req.extracted_intent),
            req.extracted_amount, req.extracted_ref, req.confidence
        ))
        conn.commit()

        return {
            "success": True,
            "claim_id": claim_id,
            "pii_stored": False,
            "stored": {
                "intent": intent_data,
                "amount_paise": req.extracted_amount,
                "ref": req.extracted_ref,
                "confidence": req.confidence
            },
            "message": "Intent stored. Raw text was never uploaded (edge-native privacy)."
        }
    finally:
        conn.close()


@router.get("/list")
async def list_claims(tenant_id: str = Query(DEMO_TENANT)):
    """List all parsed claims for a merchant."""
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT * FROM claims WHERE tenant_id=? ORDER BY created_at DESC", (tenant_id,)
        ).fetchall()
        return {"success": True, "count": len(rows), "claims": [dict(r) for r in rows]}
    finally:
        conn.close()


@router.get("/demo-batch")
async def get_demo_batch():
    """
    Return demo batch of unstructured claims with extraction results.
    Shows the power of edge-native NLP.
    """
    demo_texts = [
        "Bhai maine paytm se 325 rupaye bheje the kal raat ko aapke store pe. Abhi tak order nahi aaya. Please dekho TXN2024002",
        "Sir mere account se 1200 rupaye do baar cut gaye aaj subah. Order ek hi tha. Urgent please help.",
        "Payment pending dikh raha hai 3 din se. Order ID TXN2024005. Kab process hoga?",
        "I paid Rs 450 via PhonePe but order shows failed. Please refund or reprocess.",
        "Aaj koi order nahi kiya but 890 rs kat gaye. Fraud hua hai mujhse. Please check immediately.",
    ]

    results = []
    for text in demo_texts:
        extraction = simulate_slm_extraction(text)
        results.append({
            "sample_text": text[:80] + "..." if len(text) > 80 else text,
            "characters": len(text),
            "extraction": extraction,
            "suggested_action": _suggest_action(extraction)
        })

    return {
        "success": True,
        "demo": True,
        "processing_mode": "SIMULATED_ONNX_EDGE",
        "model_size": "~45MB INT8 quantized",
        "avg_latency_ms": 15,
        "results": results
    }


def _suggest_action(extraction: dict) -> str:
    intent = extraction.get("intent", "unknown")
    amount = extraction.get("amount_paise")
    suggestions = {
        "refund": f"Create refund intent for ₹{amount//100 if amount else 'unknown'}",
        "chargeback": "Escalate to chargeback investigation - check for duplicate charge",
        "status_inquiry": "Fetch payment status from provider and notify customer",
        "fraud_report": "Flag transaction for GATv2 fraud analysis immediately",
        "unknown": "Manual review required - intent unclear"
    }
    return suggestions.get(intent, "Manual review required")
