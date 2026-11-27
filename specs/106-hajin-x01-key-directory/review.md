# Independent planning review

2026-11-22. Read spec.md, plan.md and analysis.md plus existing key admission code. Reviewer-only artifact; no production edits or runtime execution.

## Finding KEYDIR-01 — P2 planning blocker

The new key-reference metadata is described as bounded/strict but its owning contract is not yet concrete. Before implementation, pin the exact envelope/row fields, byte/row/string/reference caps, allowed region/map/floor enums and unknown representation, identity uniqueness/join rules and failure oracle. Include the explicit80-key target ledger (62 existing +14 X01 +4 Hajin), five reused catalog item IDs and deterministic new catalog/key IDs, two encoder alias joins, and the ten exact marker/floor bindings versus source-only/unresolved rows. A concise table or reviewed data fixture is sufficient; no broader research required. Validate aliases cannot create duplicate inventory identities, each key maps to exactly one item ID, and marker references exist on the asserted map/floor rather than merely elsewhere in snapshots. Describe mismatch behavior: fail build/admission rather than silently drop key or guess region. T002/T005 should exercise wrong-region/floor/marker, duplicate reused IDs, malformed/oversized metadata and unchanged existing62 IDs/useIds.

This closes a real cross-owner ambiguity: directory IDs, catalog IDs and marker IDs belong to separate existing schemas; a generic exact-ID statement does not specify their safe join. Source counts/claims remain reviewed-provider scope, not whole-game completeness. The explicit unresolved Police identity and source-only keys are appropriate.

## Coverage / preservation

FR01–06 trace to T001–006. Additive contentVersion, authoritative existing overlays and explicit no automatic rebind/deletion are correct. Keep no coordinate/rarity/loot inventions and no cross-store stock synchronization. Browser acceptance must seed an old profile plus same-ID stored overlay, prove neither overwritten, show All keys under old/custom catalogs, and separately exercise explicit updated-catalog save/rebind with existing stocks/hospital prerequisite chain intact. Existing key/editor/backup owner invariants remain required. X01 map links must use actual marker/floor; unknowns stay visible.

- [x] Planning ready after KEYDIR-01 is pinned and independently rechecked.
- [x] Implementation/evidence accepted within the documented local scope.

## Planning repair recheck — 2026-11-22

Planning READY; KEYDIR-01 closed by contracts.md. Exact versioned metadata/roster shapes,128-key/256KiB limits, row/text/reference caps, provider/map/floor pairs, complete allKeys coverage and unique key↔item joins are pinned. Same-map/provider marker existence plus identical floor and single X01 marker ownership now fail admission on mismatch. Fixed14 X01/four Hajin IDs and explicit encoder alias assignments avoid runtime fuzzy matching; existing62 key/use identities and five catalog item identities remain preserved. Browser ID-only lookup must equal validated metadata.

Concrete source ledger and reused item/marker IDs are implementation T002 admission evidence, not yet independently verified factual data or runtime proof. Validate that ledger against these contracts and retain source-only/conflicting/unresolved distinctions. No remaining planning blocker; implementation acceptance remains unchecked pending source/data and executed owner-preservation review. Reviewer edited only review.md.

## Interim implementation source review — 2026-11-22

P2 KEYDIR-02: src/ui/key-workspace-view.mjs keyMapLinks consumes explicit marker references only for X01; Hajin falls through to grid-area links even when metadata has exact matched provider/id. src/content/unified-index.mjs likewise ignores Hajin marker references. This misses FR04 and the stated user outcome for known mapped keys. Emit the existing validated main-map provider/marker deep-link contract for matched Hajin keys; preserve explicitly area-only links for genuinely unmapped/grid-only records. Add exact mapped-Hajin rendered URL plus real click/selected-marker proof, retaining X01 floor and unknown fallbacks. Do not synthesize coordinates or infer runtime name matches.

Convergence repair needed: tests/runtime/upgrade-budget.test.mjs:278 still expects400000 while the new shared topology constant and dashboard-budget assertion use450000. Align this exact expected bound while retaining overbudget and exact-endpoint admission tests. The measured403508-value/10,394,803-byte snapshot justifies a bounded topology-only increase; unchanged12MiB/generic JSON/graph/depth caps remain necessary. Final modern/legacy build measurements and boundary test receipts are still future evidence.

Inspected metadata validator enforces full allKeys coverage, item uniqueness, provider/map marker identity/floor, X01 unique ownership, bounded shapes and browser lookup equality; inventory joins are validated against published catalog IDs/aliases. X01 detail/search links now retain exact floor/marker and source-only keys remain visible. Full draft ownership is unchanged. Concrete source claims and every factual remote record have not been independently re-fetched in this pass; captured source/hash/alias ledger and actual preservation/admission tests remain required before final acceptance. No final gate or production edits.

## Exact-marker repair recheck — 2026-11-22

KEYDIR-02 closed in current source: keyMapLinks and unified-index now emit validated Hajin key-source/key-marker links; X01 retains floor/marker. The new bounded parser rejects duplicate/wrong source/invalid marker/oversized query, and startup adapter uses existing jump only when hydrated/inspectable and without unsaved/pending visibility; retries are finite and canceled on pagehide/HMR. It does not save filters or fabricate coordinates. Directly inspected 106-key-regions-final.log contains all-three-engine80-key/region/alias/unmapped/mobile/link/save/old-overlay preservation PASS terminals. Parent additionally reports actual Chromium selected Hajin source/id and X01 floor2 persistence checks; those are parent-run evidence, not reviewer execution.

The stale topology expected constant now reads450000 in upgrade-budget, retaining admission oracles. Direct map-runtime terminal245/245 PASS inspected. Full106 runtime remains running, not accepted as terminal.

Before final convergence reconcile analysis.md's75-addition/five-reuse history with current73 additions/seven reused IDs (two existing encoded-card aliases now correctly reused), and owning contract/source ledger counts accordingly. Preserve old planning history as historical rather than asserting duplicate catalog rows. No additional confirmed source P1/P2 in this repair inspection; final implementation checkbox remains pending complete receipts and reconciled ledger.

## Aggregate and late-template source recheck — 2026-11-22

Directly inspected106-final-runtime.log terminal1163/1163 PASS,0fail/cancel/skip,679980.2806ms. Delivery reconciles73 additions/seven reused IDs/376catalog items and retains separate source-only/conflicting claims. Latest template-only changes use validated captured place names for multi-marker links and source-record dates rather than attributing new X01 data to the Game8 date; labels remain escaped and marker joins already validated. Directly inspected106-final-key-template.log12/12 PASS after those changes. No new source blocker. Final disposition waits latest rebuilt browser terminal and delivery append distinguishing full aggregate from subsequent template-only focused rerun; no full rerun is demanded for this bounded display delta. Modern topology diagnostic and final build receipts must remain accurately scoped to actual output, not imply a served modern production variant.

## Final independent scoped acceptance — 2026-11-22

PASS. KEYDIR-01/02 and stale topology-oracle/count reconciliation are closed. Directly inspected final rebuilt region-browser log contains Chromium/Firefox/WebKit PASS for80 keys/66Hajin/14X01, aliases,16 unmapped entries, mobile, correct links, actual save and older overlay/cash/stock preservation. Final format and structural logs report PASS/0failures. Delivery final reconciliation accurately distinguishes1163/1163 aggregate before the two late date/label corrections from12/12 focused tests and rebuilt browser/build afterward.245 map tests and retained key/editor owner evidence retain their stated scope.

Modern430772-value/10,798,459-byte proof is explicitly a private diagnostic output predating the two text changes, not a served modern browser claim. Final legacy402876-value/10,381,477-byte graph has0issues within the scoped450000/12MiB ceilings. Known unmapped/conflicting/provider-relative coverage remains visible; no whole-game completeness, private quantity synchronization or independently re-fetched every-source claim is made.

No remaining confirmed P1/P2 from inspected source/artifacts and parent-run receipts. Reviewer did not independently rerun the full suites. This accepts the documented local feature and closes its reviewer prerequisite for local commit; it does not approve push, merge, deployment or new provider rights. Only review.md edited.
