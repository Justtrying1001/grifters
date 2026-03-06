# Grifter ingestion pipeline (staged)

## Current repository inspection

### Final production schema review
Existing production tables already include `incidents`, but did not include the full Step 3 materialization model set (`entities`, `entity_aliases`, `entity_wallets`, `incident_entities`, `incident_sources`, `claims`, `manual_review_queue`).

Step 3 adds these missing normalized final tables while keeping the existing `incidents` table and linking safely via provenance.

### Staging and candidate layers
- Step 1: `raw_sources`
- Step 2: `normalized_thread_candidates`, `normalized_candidate_entities`, `normalized_candidate_claims`, `normalized_candidate_wallets`

Step 3 reads from Step 2 tables only (with `rawSource` reference for source-link traceability).

---

## Minimal migration plan status

1. **Step 1: Raw import** ✅ implemented
2. **Step 2: Structured extraction candidates** ✅ implemented
3. **Step 3: Materialization into final tables** ✅ implemented

---

## Step 3 implementation

### Final tables added (minimal, normalized, idempotent-safe)
- `entities`
- `entity_aliases`
- `entity_wallets`
- `incident_entities`
- `incident_sources`
- `claims`
- `manual_review_queue`

`incidents` is reused as the final incident table.

### Materialization script
`prisma/materialize-normalized-candidates.ts`

#### Inputs
Reads from:
- `normalized_thread_candidates`
- `normalized_candidate_entities`
- `normalized_candidate_claims`
- `normalized_candidate_wallets`

Does not parse raw text during materialization logic.

#### Entity resolution rules (conservative)
- Exact handle alias match can merge.
- Exact wallet match can merge.
- Name-only match does **not** auto-merge.
- Ambiguous matches are inserted into `manual_review_queue`.
- Low-confidence entities are queued for manual review.

#### Incident creation
- One incident per normalized thread candidate.
- Uses a deterministic slug (`normalized-<externalId>`).
- Incident type and confidence come from thread candidates.
- Status is set to `PENDING` for safe review-first operation.
- Links source via `incident_sources`.

#### Entity linking
- Materialized entities are linked through `incident_entities`.
- Candidate provenance and confidence are stored.

#### Claims
- Candidate claims are materialized into `claims`.
- Evidence snippets and confidence are preserved.
- Claims link to both incident and incident source.

#### Wallets
- Wallet links are created only for high-confidence ownership mappings.
- Unresolved or ambiguous ownership is routed to `manual_review_queue`.

#### Idempotency and safety
- Unique constraints and upsert/find checks prevent duplicates on re-runs.
- Manual review queue uses deterministic dedupe keys.
- Dry-run mode performs all decision logic without writes.

### npm scripts
- `npm run db:materialize`
- `npm run db:materialize:dry`

---

## Safety and policy rules enforced
- No aggressive entity merging.
- No legal guilt assertions.
- Neutral language only.
- Confidence-aware materialization.
- Manual review queue for ambiguous or low-confidence cases.
- Provenance preserved back to normalized candidate and source IDs.
