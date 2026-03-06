# GRIFTER INGESTION

## Goal
Convert raw ZachXBT thread exports into structured database records safely.

## Important
- Do NOT seed final production tables directly from raw text.
- Use a 3-step pipeline:
  1. import raw threads into raw_sources
  2. extract structured candidates into intermediate tables
  3. materialize only high-confidence records into final tables

## Rules
- Neutral language only
- No legal guilt assertions
- No aggressive entity merging
- Exact wallet/handle match can merge
- Name-only match must go to manual review
- 1 thread = 1 source document, not necessarily 1 person or 1 project

## Input
- Raw file is already in the repo

## Expected entities to extract
- people
- aliases
- handles
- wallets
- organizations/projects
- incident type
- claims with evidence snippets
