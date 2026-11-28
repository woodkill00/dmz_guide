# Reference gap resolution

Status: source-backed batch implemented and verified; remaining evidence gaps retained. Date:2026-11-28. Branch:feature/113-reference-gaps.

## Intent
Continue the source/content backlog after feature112. Users need accurate item, recipe, upgrade, Order and map references. Fill supported facts and retain uncertain fields; no zeroing the audit by hiding records.

## Stories
1. Read useful item references: exact provider identities fill supported rarity, pictures and descriptive/loot hints.
2. Understand tracking: requirements remain numeric only when supported; non-inventory actions, consumption uncertainty and conflicting reports remain explicit.
3. Inspect map coverage: retry DMZHub; preserve snapshots when unavailable and never guess positions/floors.

## Requirements
- FR01: preserve and reconcile all1,006 current findings by identity/binding; no unexplained removals or editorial/player writes.
- FR02: collect only approved sources with bounded existing adapters; report failures and compare before applying supported facts. Preserve aliases and separate catalogs.
- FR03: fill only supported missing fields; no inferred rarity, cost, consumption, coordinate or prerequisite. New artwork stays ignored unless redistribution is approved.
- FR04: retry DMZHub without bypass; compare all available floors, stable identities and repeat imports, or retain old data with an explicit failure.
- FR05: validate schema/calculations and affected readers plus negative cases and independent review. No unrelated UI redesign.
- FR06: defer Android/TalkBack and recovery; no owner-profile access or restoration.

## Acceptance
Every correction has exact source/date and record evidence; every removed finding reconciles; provider failure preserves prior bytes; tests cover changed behavior. Reports distinguish examined, corrected, unchanged and unresolved. No complete-game claim.

## Clarifications
Prior permission covers these sources for local collection; no new public artwork grant inferred. User already deferred device testing/recovery. No further clarification needed before research. Missing evidence is an outcome, not authorization to guess.
