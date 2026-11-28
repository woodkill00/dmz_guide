# Reference gaps: independent planning analysis

Reviewer: `/root/review_112`. Date:2026-11-28. Owning feature: `113-reference-gaps`; branch `feature/113-reference-gaps`. Inspected base/HEAD: `14ca242bbcb6afe56c7be1b0e296ec247b9182c4`. Reviewed intended new `spec.md`, `plan.md` and `tasks.md` under this feature; unrelated `.playwright-mcp/` excluded. Reviewer writes only this report and `checklists/verification.md`.

## Initial implementation/source candidate review

Implementation acceptance remains OPEN. Independently ran `node --test tests/runtime/key-rarity.test.mjs`: catalog initialization failed at `$.sources[105].provenance.observationKey: invalid format`. The new DMZCodex source observation keys include canonical item IDs with `:`, which violates `schemas/pack.schema.json:1614`'s alphanumeric/hyphen grammar. Repair the new source keys to valid stable observation identities; do not relax the schema. After that repair, rerun the focused test and documented schema/build/reconciliation/reader checks. A further visible fixture mismatch needs resolution: new item-page rarity test requires item `status:"observed"`, while field-upgrade box files were still `unverified` at inspection; align status/evidence deliberately without implying unrelated gameplay facts are verified.

Read the selected public CODCentral/DMZCodex evidence, raw source candidate reports, changed source/manifest/item records, DMZHub retry receipt and focused tests. Source-reported confidence, local-only artwork, canonical-versus-historical separation and unchanged consumption/recipe uncertainty are retained. The DMZHub receipt reports403/failed normal requests with no challenge bypass and no available new floors/positions; this is a failed live comparison, not a successful map update. Final public verification receipt was not yet present during this initial implementation review.

### Four additional manual identity candidates

Independently matched the four `explicit-normalized-name-and-map` candidate source rows against the raw captured marker attributes and verified the raw HTML hash equals `450de2647514927cc158fe81ca9d45b8ed335470ede72d4e8b2a0f8140b818df`. Explicit source names match canonical names; these support rarity-only source reports via deliberate named bindings:

| Canonical identity | Source marker | Explicit rarity | Source map evidence |
| --- | --- | --- | --- |
| `mw4:key-air-base-armory-card-single-use` | `key-air-base-armory-card` | Legendary | No-floor Hajin; exact Single Use display name |
| `mw4:key-x01-chol-min-stash-room` | `x01-key-chol-mins-stash-room` | Legendary | Explicit floor2 |
| `mw4:key-x01-small-test-chamber` | `x01-small-test-chamber` | Epic | Explicit floor1 |
| `mw4:key-x01-superintendent-office` | `x01-key-superintendents-office` | Epic | Explicit floor2 |

These are acceptable reviewed sourceSlug→canonicalID mappings, not permission for generic fuzzy-name enrichment. Before applying, update the concrete-batch plan/evidence to name the four manual bindings, retaining missing-only fields, exact capture/date and observed source confidence. They provide no coordinate/drop/consumption/availability guarantee and do not justify copying metadata to historical identities. No evidence supports promoting the deliberately unclassified Archive Closet rarity.

**Planning gate: PASS for the bounded research and source-supported content correction scope.** No blocking ambiguity, contradiction, uncovered requirement, duplicate requirement or constitutional conflict found. No production code change is authorized merely by the generic content correction task: the plan explicitly requires a concrete reproduction, appended scoped task and reanalysis if research identifies a code repair.

## Final independent implementation/receipt review

**Final scoped review: PASS; no unresolved must-fix standards/spec finding.** This supersedes the earlier receipt-location limitation and resolved initial schema/status failures. The actual batch receipts are under `test-results/113/`, separately from source captures under `test-results/content113/`.

Independently inspected the newly persisted baseline/reconciliation, tests/audit/build receipts and durable `verification.md`. Reconciliation records1,006 baseline findings,58 factual corrections,zero classification corrections,948 outstanding andzero new findings. The focused receipt reports9/9 passing, matching the reviewer's independent9/9 execution. The final build log records2,277 independent HTML routes plus404. Also read three actual built reader files for Hospital Chemical Lab, X01 Audit Room and Utility Box: each contains its respective Rare/Epic/Ultra rarity and observed evidence status. Schema validation is exercised by loading the complete catalog in the passing focused tests. The durable receipt reports repository/format checks separately; those claims are not substituted for the specifically inspected test/build evidence here.

The accepted scope is53 missing key rarities plusfive canonical item-page rarities, with explicit source/date/identity evidence and unchanged unsupported mechanics. The four manual source bindings are deliberate individual dictionary entries. Historical records, photographs, ingredients, positions, consumption and unlock claims were not fabricated. The raw DMZHub retry receipt records ordinary requests/browser403 and preserves old data; no available live-floor equality is claimed. Remaining948 findings are unresolved facts, not completed game verification. Owner-deferred Android/TalkBack and backup/recovery remain deferred. Reviewer changed only own report/checklist artifacts and does not check off execution tasks, merge or publish.

## Repaired content implementation re-review

The schema/source-status blockers from the first implementation review are resolved. New observation keys use the existing permitted hyphen format. The four boxes now have observed status, with the deliberate task decision retaining unverified recipes/effects/unlocks and avoiding verified gameplay claims. T008 explicitly admits the four individually reviewed manual source bindings; the focused test uses their exact dictionary rather than a generic fuzzy matcher.

Independently ran `node --test tests/runtime/key-rarity.test.mjs tests/runtime/content-verification.test.mjs tests/runtime/site-quality.test.mjs`: 9/9 pass, including exact53 key/5 item-page identity/value/provenance, unresolved Archive Closet, complete reconciliation validation and unchanged quality safeguards. Also compared all58 changed tracked item records against HEAD: every prior rarity was absent, and no changed field lay outside rarity/sourceIds/status/description. No historical catalog, recipe, quantity, map position or runtime production change appears in this bounded diff. No additional must-fix content/implementation defect found.

**Content implementation review: PASS. Overall acceptance receipt review remains OPEN** until the owner persists the exact113 baseline/reconciliation and final schema/build/reader outcomes. At this inspection `verification.md` was absent and `test-results/content113/` held source research/captures but no final audit/reconciliation/build receipts. The existing content112 reconciliation still describes1264→1006 and cannot substantiate the newly reported1006→948. The owner-reported58 corrected count is consistent with the inspected58 missing-only changes but is not substituted for exhaustive finding evidence. DMZHub403 remains an explicit unavailable outcome; physical/recovery stay deferred.

## Exact-key rarity batch reanalysis

Independently reread the updated plan and new research/data-model/quickstart documents. Prerequisites again select113 and include the added documents. Planning gate remains PASS for the concrete first batch under T003/FR01–03: use the existing canonical item-to-key links and exact provider slug/map identity, fill only missing rarity from explicit provider data, add source/date/hash evidence and preserve unrelated fields. Unknown, unmatched or conflicting rows stay untouched, historical packs are excluded from name-based propagation, and generic rarity glyphs cannot count as item photographs. The existing `src/domain/key-item-links.json` does carry exact `keyId` and `mapId` relationships as the plan assumes.

New data documentation introduces no schema or player-state migration. The quickstart includes schema, affected runtime, audit/reconciliation, build and reader verification. Research's reported403 DMZHub outcome is a retained failed comparison, not a floor/update pass; the reviewer has not independently reproduced the network outcome in this planning assessment. No new requirement conflict, unsupported gameplay assumption, code repair or asset right is implied. All11 reviewer checklist criteria pass after this reanalysis. Actual evidence identity/hash matching and preservation of unknown/conflicting rows remain implementation review checks, not facts established by this planning pass.

The active ignored feature pointer selects113; the required pinned prerequisite invocation `check-prerequisites.sh --json --require-spec --require-tasks --include-tasks` passed and reported this feature with `tasks.md`. Repository/constitution/workflow review rules from the preceding independent review remain applicable; no extension hooks are configured. No task execution, actual provider outcome or implementation acceptance is certified by this planning assessment.

## Requirements and coverage

| Requirement | Tasks | Assessment |
| --- | --- | --- |
| FR01 baseline identity/binding accounting and no state writes | T001,T003,T005 | All1,006 findings remain accounted for; existing reconciliation verifier owns disappearance evidence. |
| FR02 approved bounded source comparison before apply | T002–004 | Existing source tools, exact matches, separate catalogs and aliases remain boundaries; provider failure is explicit. |
| FR03 source-supported fields and local-only artwork | T002,T003,T005 | Prohibits inferred rarity/cost/consumption/spatial/prerequisite semantics and unapproved artwork redistribution. |
| FR04 DMZHub retry/floors/stable IDs/repeat | T004,T005 | Failure preserves prior data; no bypass or invented coordinates/floors. |
| FR05 schema/calculations/readers/negative cases/review | T005 | Changed behavior receives tests and independent implementation review; no unrelated redesign. |
| FR06 deferred physical/recovery and private profile isolation | T001,T005; completion note | Explicit exclusion is consistent across artifacts; no physical pass is implied. |

Six requirements, five tasks, six of six semantically covered (100% association); no unmapped task. Acceptance distinguishes examined, corrected, unchanged and unresolved; exact evidence/date and byte-preserving provider failure are assessable. Zero CRITICAL/HIGH/MEDIUM findings. The small artifact size is proportionate to source/content follow-up work with unchanged contracts and no planned migration/dependency.

## Implementation/evidence boundary

Research must preserve the current exact audit baseline before edits, retain per-record outcomes and compare approved-source evidence before mutation. Generic unresolved evidence remains unfinished factual work, not factual completion. Retry failure must be recorded honestly and cannot justify weakening adapters or bypassing source access. The existing scope does not admit new providers, player writes, public asset grants, physical observations or recovery. Any material source ambiguity or new software behavior should be resolved in owning artifacts before dependent implementation and independently reassessed.

The original reviewer-owned checklist had10/10 assessed requirements-quality criteria satisfied; exact-key batch reanalysis adds one satisfied criterion. This does not mark T001–T005 done or certify that any source correction or DMZHub comparison has occurred.
