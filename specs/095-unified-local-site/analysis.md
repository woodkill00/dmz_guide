# Independent planning analysis — iteration1

2026-11-20. Reviewed spec/plan/research/data-model/contracts/quickstart/tasks and existing serving/storage boundaries, read-only. This report and reviewer checklist are the only edits. No implementation/runtime acceptance.

## Concrete findings

| ID | Severity | Location | Required repair |
| --- | --- | --- | --- |
| UNIFY-01 | P2 / blocking | contracts/local-site.md routes/artifacts/status; T003–005/T008 | Finite routing/public exposure and bundle identity are promised but not yet enumerated. Four canonical mappings are exact; the other seven-entry aliases, audited asset subtrees and status/manifest bundle identity fields/admission are unspecified. Pin the exact seven entries, allowed compiled/public resource roots/file classes, existing plugin mounts/security/byte-limit owners, exact manifest/status identity fields and missing/corrupt/stale artifact readiness oracle. This is needed to distinguish safe unified installation from arbitrary artifact/project serving and to test SkipBuild/idempotent service recognition. Retain guide-only behavior and last-good publication without claiming combined atomicity. |
| UNIFY-02 | P2 / blocking | contracts/local-site.md preference transfer; data-model; T007 | A finite preference allowlist is required but absent, and entries representation/apply ownership is not exact. Enumerate map-owned keys/patterns with their existing schema owner; exclude transient handoff/nonce/token/service/profile keys explicitly. Pin entries representation, selection/comparison capture and interrupted/partial-write rollback rules: rollback may restore a key only if its bytes still equal this apply's written value, otherwise report uncertainty and preserve another writer. Test absent vs empty strings, corrupt inert exports, wrong/unknown keys, target change during review, quota after partial apply, competing writer during rollback and pagehide/late callback. Do not silently import executable/path authorities or guide state. |

## Coverage and strengths

All11 FRs map to T003–009; US1–4/SC01–04 are scoped. Built namespaced frontend without a permanent Vite server, separate safe local asset serving, fixed API mounts, existing publisher/backup owners, distinct stores, explicit old-origin retention and optional author4174 are reasonable. No new provider facts/public distribution/account authority is implied. One-address route consolidation cannot move browser storage; explicit migration preserves that distinction.

Disposition: planning pending the two concrete contract/failure-oracle repairs. No new product feature or full preimplementation discovery demanded. Reviewer has not browsed external research pages or run builds/tests; research/API compatibility still requires implementation evidence.

## Independent planning analysis — iteration2

2026-11-20. Reread exact admission refinements and owning plan/task scope. UNIFY-01/02 are resolved for planning readiness; no remaining concrete blocker in this bounded pass.

UNIFY-01 closure: exact seven historical HTML entries plus new migration entry/canonical route, manifest-only compiled paths/extensions/byte/file caps and finite public-map roots/types/denials are stated. Fixed artifact root, exact manifest/status identities, hashes/source fingerprint and missing/invalid/stale readiness distinguish serving retained last-good bytes from a fresh readiness claim. Existing plugin owners retain security/size/schema limits. Guide-only optional route exemptions are finite rather than arbitrary broken-link waivers. Tests must prove actual asset coverage and no private inclusion; contracts do not by themselves demonstrate production safety.

UNIFY-02 closure: exactly18 map-owned keys, explicit excluded job/receipt/token/guide namespaces, original string/absent/empty semantics, source origin grammar, bounded envelope/road exception and invalid-value apply refusal are specified. Captured selected-byte compare before any write plus conditional reverse rollback preserve competing writer values; new import/selection/lifecycle expires Apply, uncertainty preserves/export candidate without retry. Existing backup codecs retain workspace/image ownership; main restore precedes preferences and legacy source filters cannot override canonical masks or replay migration.

Planning disposition READY. T002 can close; implementation T003–010 and executed browser/build/security/migration/one-listener evidence remain future work. All11 FRs retain task owners. No production edits, runtime tests, external factual verification or merge/publication approval in this review.
