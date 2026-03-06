# Grifter ingestion pipeline (staged)

## Current repository inspection

### Current Prisma flow
The current production-facing models remain `Person`, `Project`, `Incident`, and `Source`, plus moderation models (`Response`, `Dispute`, `AdminAuditLog`).

The staging layer now includes:
- `raw_sources` (Step 1)
- Step 2 candidate tables described below

### Raw source input
`threads_raw.json` remains the initial import artifact. Each thread is treated as one source document in `raw_sources`.

## Minimal migration plan status

1. **Step 1: Raw import** ✅ implemented
   - `raw_sources` table
   - idempotent importer script

2. **Step 2: Structured extraction to candidate tables** ✅ implemented
   - `normalized_thread_candidates`
   - `normalized_candidate_entities`
   - `normalized_candidate_claims`
   - `normalized_candidate_wallets`

3. **Step 3: Materialization to final production tables** ⏳ not implemented yet
   - no writes to final incident/entity tables in this step

---

## Step 2 implementation

### New candidate tables

#### `normalized_thread_candidates`
One record per `raw_sources` record:
- stores deterministic extraction result JSON
- stores optional LLM extraction result JSON
- stores merged normalized result JSON
- stores incident type candidate, confidence, and manual-review flag

#### `normalized_candidate_entities`
Normalized entities extracted per thread candidate:
- `kind`: `PERSON`, `ALIAS`, `X_HANDLE`, `WALLET`, `ORGANIZATION`, `PROJECT`
- `value`, `normalizedValue`
- evidence snippet
- source method (`regex`, `heuristic`, `llm`)
- confidence
- metadata JSON

#### `normalized_candidate_claims`
Claim candidates with evidence snippets and confidence.

#### `normalized_candidate_wallets` (optional, implemented)
Wallet-specific candidate records for cleaner downstream matching/materialization.

### Extraction script
`prisma/extract-normalized-candidates.ts`

#### Input
Reads from `raw_sources` only.

#### Deterministic extraction first
- X handles via regex (`@handle`)
- wallet addresses via regex (EVM + Solana-like base58 patterns)
- person heuristic via `@handle (Real Name)` pattern
- organization heuristic via simple phrasing patterns
- claim lines from explicit claim/reporting language
- incident type heuristic classification from explicit text patterns

#### LLM extraction second (optional)
When `--llm` is enabled and `OPENAI_API_KEY` is available:
- calls model with strict JSON schema output
- extraction prompt explicitly instructs: only explicit facts, no inference, keep ambiguity unresolved
- merges LLM output with deterministic output (dedup by normalized keys)

### Persistence behavior
- Stores both deterministic result and merged normalized result
- Stores optional LLM result separately
- Idempotent per `rawSourceId`
- Update path replaces child candidate rows atomically
- Dry-run mode computes extraction and logs actions without writing

### npm scripts
- `npm run db:extract:candidates`
- `npm run db:extract:candidates:dry`
- `npm run db:extract:candidates:llm`

---

## Safety and policy rules enforced in Step 2
- No writes to final production incident/person/project tables.
- No aggressive identity merging.
- Neutral extraction language only.
- No legal conclusions are generated.
- Ambiguous identities remain ambiguous and may be flagged for review.
- Claims include evidence snippets from source text.
