## 🛡️ Vyapaar Kavach — Pull Request Template

### Description of Changes
*Provide a concise summary of the problem addressed and the solution introduced in this PR.*

### Related Issues / Tickets
- Fixes #
- Related to #

### Component Affected
- [ ] Backend: EXCEPTIONS_V1 Policy Engine (`vyapaar_disputes.py`)
- [ ] Backend: Edge SLM Claim Parser (`vyapaar_claims.py`)
- [ ] Backend: Transactional Outbox & Worker (`vyapaar_outbox.py`)
- [ ] Backend: ZK-SNARK Fraud Syndication (`vyapaar_zk.py`)
- [ ] Backend: Cryptographic Audit Logs (`vyapaar_audit.py`)
- [ ] Database: Schema migrations / SQLite models (`vyapaar_models.py`)
- [ ] Frontend: UI Components & Dashboards
- [ ] Documentation / CI / Config

### Testing Completed
- [ ] Ran `python -m pytest Backend/tests/test_vyapaar.py -v` (All 10 tests passed)
- [ ] Verified idempotency and state machine transitions
- [ ] Checked privacy compliance (no PII written to logs/DB)
- [ ] Frontend build succeeds (`npm run build`)

### Architectural Checklist
- [ ] Adheres to the `EXCEPTIONS_V1` deterministic policy matrix
- [ ] Preserves privacy (Zero PII transmitted across networks or saved unhashed)
- [ ] Implements idempotency keys for any fund or dispute state mutation
- [ ] Outbox operations simulate or enforce lease locks to prevent double-payouts
