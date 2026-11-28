# Specification analysis report

**Current planning gate: PASS after repair reanalysis.** All three initial findings are resolved in the written artifacts; the original assessment below is retained as history. This gate approves requirements quality, not implementation completion.

Independent requirements review, 2026-11-28. Reviewer: `/root/review_112`.

## T023 owner-deferred device task documentation review

Reviewed the narrow documentation follow-up against HEAD `bc658d49a154165c9b65a6054487f361af8a2c46` and its uncommitted documentation changes. T023 requirements/instructions assessment: PASS. The updated specification records the owner's explicit deferral; T013 remains unchecked. Neither task indexing nor the prior desktop/software pass is presented as a physical Android/TalkBack result.

Read `user-tasks/README.md`, `user-tasks/android-testing.md`, the legacy `docs/android-verification.md` link page, and affected feature/status/index references. The maintained guide covers site startup, USB debugging and Chrome forwarding of4173 to desktop loopback, isolated Incognito synthetic progress, touch and TalkBack checklists, blank per-area results/reproduction/version fields, and cleanup. It preserves the existing documentation destination, avoids authoring-port/LAN/firewall exposure, and excludes private profiles/credentials from repository receipts. All local task/index/legacy destinations inspected exist. No device action or runtime test is implied or needed for this documentation-only change.

One LOW editorial finding at inspection: `docs/README.md:3` and `:5` duplicate the User task lists entry with nearly identical descriptions. Remove either duplicate; it does not invalidate the procedure or deferral semantics. The owner is running the final repository/documentation check; this report does not turn an earlier check receipt into verification of later edits. Software acceptance remains PASS as previously scoped, physical testing is now explicitly owner-deferred, factual1,006 findings remain visible, and backup/recovery remains deferred.

## Final integration receipt verification

**Final independent software review/convergence: PASS.** The last pending integration execution receipt is now resolved. Independently read `test-results/content112/python.log`: `Ran 84 tests in 660.476s` followed by `OK`. Its later synthetic blocked-provider diagnostic is explicitly fixture output, not a real-source failure claim. Independently read `repo-final.log`: `Repository checks: 0 failure(s)`. Parsed the final map-browser JSON: 117 checks, zero runtime errors, zero external requests, `synthetic:true`, `physicalDeviceTested:false`. Earlier final touch/reliability, focused, runtime/build, card and visual assessments remain scoped above. No unresolved must-fix implementation finding remains.

The updated durable verification receipt records these actual results. T014 is checked; T013 remains unchecked for actual Android Chrome/TalkBack observation. Software PASS does not resolve the1,006 remaining factual findings, unknown gameplay/current-build semantics, blocked/unavailable provider comparisons, or missing physical observations. Backup/recovery remains deferred. This assessment changes only the reviewer report and neither merges nor publishes the working tree.

## Final independent software review and convergence assessment

**Review verdict: PASS for the inspected software changes; no unresolved must-fix standards, spec or sampled visual defect.** This supersedes earlier interim open implementation findings. It is not an all-checks-complete verdict: the owner-reported full Python/package run is still in progress, with no final success receipt at inspection time. Record that actual result before declaring integration verification complete.

Inspected final map-browser receipt: X01 floor/direct-link/search/filter/persistence/missing-image cases, DMZHub retained-floor cases and workbench alignment/review/route/mobile cases passed; `runtimeErrors` and `externalRequests` are empty and `physicalDeviceTested:false` remains explicit. Exact expected X01 counts31/107 reflect source-backed additions rather than relaxed assertions. The earlier outstanding map-browser receipt is now resolved.

Inspected corrected async-wait touch receipt: all three engines passed with `completed:true`, no failure, and explicit physical/screen-reader pending fields. Core reliability log also reports all three engine journeys passing; the aggregate artifact is `test-results/reliability/journeys-all.json` (not under content112). Collection/reliability replacements retain exact persisted value/revision assertions and the awaited helper boundary. Final mission audit now retains original exact provider identities per Hajin/X01 plus validity of any new source, observed status and zero fabricated effects; focused final coverage receipt is12/12 passing. The source-sensitive quality journey still tests real outstanding item findings, save/Later/reload, exact reader/editor links and layout rather than requiring resolved weapon findings to reappear.

All identified planning/implementation findings have a documented repair or supported evidence disposition. T021's source-sensitive fixture repair is supported by current owning browser receipts even if the owner's task checkbox is not yet updated; the reviewer does not modify owner task markers. Earlier focused/runtime/build/card/Axe/visual evidence remains scoped as documented above. No additional production change or broader testing demand arises from this review unless the pending full Python/package check exposes a failure.

Software convergence does not erase the explicitly unresolved1,006 factual findings, provider/gameplay uncertainty, 11 raw-only shared-floor references, unavailable live DMZHub comparison, or T013's actual Android/TalkBack observations. Those remain separately visible. Recovery stays deferred. A future commit or merge must preserve the reviewed content and carry actual final check results; this working-tree review authorizes neither publication nor merge.

## T022 browser polling convergence assessment

T022 planning gate PASS. Independently inspected pinned `node_modules/playwright-core/lib/server/frames.js:1245`: `next()` obtains synchronous `success = predicate()` and fulfills on its truthiness. An async predicate therefore supplies a truthy Promise before its eventual false result, supporting the reproduced saved-revision false-positive diagnosis. Bounded awaited evaluation is an appropriate test-lifecycle repair under FR-006/008; it must retain exact saved values/revisions and original per-call deadlines.

Reviewed the initial pure polling helper and independently ran `node --test tests/runtime/browser-poll.test.mjs`: 2/2 pass. The regressions cover repeated async false results before success, argument preservation, false-until-deadline rejection and a stalled evaluation's bounded rejection. No additional must-fix defect identified in this helper assessment. Pending browser replacements/reruns are execution work, not certified by the helper tests. Earlier touch-suite passes precede this corrected waiting boundary and cannot substitute for affected-suite reruns. Production behavior is outside this scoped repair, and physical Android/TalkBack remains pending.

## Final implementation re-review, map browser receipt pending

Latest independent assessment: **no unresolved must-fix implementation defect found in the reviewed changes**. Planning remains PASS. Final map-browser execution receipt was still incomplete when inspected, so this reviewer does not certify that run. Physical Android/TalkBack and the 1,006 factual findings remain separately pending; no full-game completion, gameplay calibration or recovery pass is inferred.

Re-reviewed the final semantic-wrapper/heading fixes, changed roster/artwork/provenance assertions, touch harness, CSS adjustment and source-driven X01 browser counts. T019 correctly replaces the unsupported article/listitem combination with a permitted div/listitem; T020 uses an h2 in the native summary above h3 weapon groups and inherits compact styling. Expanded combat coverage is supported by explicit null/unknown checks, retains the 33 known artwork assets and asserts new missing-art fallbacks. Mission provenance checks now admit additional valid source IDs while retaining observed status and zero fabricated effects. X01 floor31 assertions follow the new source-backed Room202 marker rather than hiding a missing marker.

Touch harness changes preserve test meaning: actual delivered `touchstart` is asserted after tap instead of treating Firefox's `maxTouchPoints` surface as event-delivery evidence. Axe `.options({preload:false})` disables its optional preload step, not the Axe rules or application CSP. The strict browser health monitor remains active and violations are still asserted empty. The separately reproduced preload/CSP conflict is a harness boundary, not authorization to waive page security errors.

Actual receipts inspected: `full-check.log` reports 1,256 runtime passes/zero failures and a successful 2,277-route build; `touch-results.json` reports completed Chromium/Firefox/WebKit emulated touch with no failure; `cards.log` reports weapon/reusable card reflow passing all three engines; `ui-audit.log` reports 423,763 CSS bytes. Previously reviewed source-comparison and exact-finding reconciliation evidence remains appropriately scoped. These inspected receipts supersede the earlier known intermediate failures in this report. They are working-tree evidence, not a claim about a later commit or CI revision.

Visually inspected actual images with `view_image`: `test-results/content112/touch-chromium-quality.png`, `test-results/card-reflow/webkit-m4-card.png`, and `test-results/card-reflow/webkit-upgrade-purchase-200.png`. The sampled quality page has clear labels/controls and readable gap limits; the compact M4 actions and enlarged purchase control have no observed clipping/overlap defect in those captures. Sample review does not certify every route, physical touch or spoken screen-reader output.

The current `verification.md` remains an honest in-progress draft but should receive final actual broad/touch/card outcomes once the remaining map-browser run finishes. The reviewer has not changed production, task completion markers or owner evidence receipts. Final report/checklist requirements-quality approval does not check off the externally blocked physical task.

## T020 and source-receipt re-review

T020 planning gate PASS: an existing chooser summary becomes a level2 heading above level3 category headings; native disclosure, labels and compact appearance are preserved, with touch/Axe and card reflow reruns explicitly required. This bounded FR-006/007 task adequately addresses the observed heading-order failure. The current production markup already reflects the intended h2, but that inspection does not certify browser/reflow acceptance.

Previously open source-evidence items E1/E2/E3 are resolved as evidence-coverage findings after independent inspection of the updated files:

- E1: `orders-comparison.json` now assigns all 87 missions in 29 groups actual `unchanged`, `improved`, `retained-detailed` or `conflict` outcomes with source URLs and reasons. Hard Carry's 2-versus-5 Structural Alloy disagreement is explicitly retained in the reader; source-comparison completion does not resolve that factual conflict.
- E2: `upgrades-source-comparison.json` records 34/34 source-parity outcomes, per-record mapped cost/prerequisite/effect comparison, and matching fresh/stored TroubleChute bundle SHA. These are provider comparisons, with gameplay and consumption uncertainty stated.
- E3: `map-scope-dispositions.json` has 63 unique removed IDs with source floor/capture hash and native-versus-raw disposition: 52 native X01 entries and 11 raw-only shared-floor references. Arithmetic reconciles: 487 original minus63 excluded plus2 new Hajin equals426. The 11 shared-floor references remain unrendered natively, explicitly. `map-audit.json` additionally records current source digests/counts and scoped model diagnostics.

The durable `verification.md` draft now exists and explicitly leaves broad/browser completion and physical observations pending. No completion-evidence misrepresentation found in that draft.

Implementation acceptance remains OPEN: the inspected `full-check.log` still reports five failures in old combat-coverage/artwork and mission provenance assertions; the mission-audit assertion at line66 assumes exactly two sources even though the correction legitimately adds a dated third source. Its repair must preserve required provenance identities/validity rather than impose the outdated cardinality cap. Current touch/card/broad reruns and final independent review are still required. The historical known Axe failure is not waived by source receipt completion. Physical Android/TalkBack remains pending.

## Initial implementation review (in progress)

Base/HEAD remains `09499d06c3c3ecbe67023e13341a5a649a631414`; implementation is an uncommitted working-tree change. Reviewed changed/new reconciliation, quality classification, source-scope filtering, WZStats/MapGenie adapters, comparator/patch parsing, X01 alignment and snapshot handling, associated focused tests, Android instructions, and sampled content/evidence diffs. The touched-path inventory is the current `git diff --stat` plus intended new implementation files from `git status --short`; unrelated `.playwright-mcp/` remains excluded. No production edits made by the reviewer.

T019 planning gate PASS: its exact reproduced article/listitem semantic-wrapper repair is bounded by FR-006/007 and requires Axe/touch regression evidence without an assertion waiver. Updating stale combat-roster assertions for the two explicitly supported identities is consistent with FR-002/005 because the task explicitly requires unsupported numeric fields to remain unknown. This is a requirements decision before that repair, not verification of it.

### Standards findings and evidence

- S1, MEDIUM, known repair in progress: the current `test-results/content112/touch-results.json` records `completed:false` and Axe `aria-allowed-role` for `<article class="needed-entry" role="listitem">` on Needed. T019 must repair the permitted wrapper and the actual route suite must pass before FR-006/SC-004 acceptance. Do not ignore this Axe rule.
- No additional supported implementation standards defect was found in the inspected logic. Pure source filtering preserves the original input and source/private distinctions in focused tests; optional sprite fallback retains partial/unsafe rejection; WZStats keeps explicit loot semantics; held-out diagnostics distinguish cross-source prediction from gameplay calibration.

### Spec acceptance evidence still outstanding at this review point

- E1: `orders-comparison.json` covers 29 groups and 87 missions but every mission is marked `instructions-present-needs-semantic-review`. This is explicit unfinished comparison, not a completed per-record source-review outcome under FR-003/SC-002. Finish semantic review or retain this as unresolved requested work, with actual per-record outcomes and reader links; checking that instructions merely exist cannot close T006.
- E2: `recipe-parity.json` contains 95 stored GameBoost comparisons, 95 FOB entries and nine X01 entries, with fresh GameBoost fetch failure explicitly retained. No per-upgrade outcome receipt for all 34 upgrades was found in the inspected evidence. Produce that outcome inventory before claiming FR-003/T006 complete.
- E3: `map-scope-dispositions.json` explains 487→426 capture change but assigns every removed ID the generic statement `preserved as X01 source-floor reference`. Native X01 accepts numeric floors 1/2 and contains 52 markers; shared-floor source records are a separate path. Bind each removed ID to its actual native X01 record or retained raw/shared source evidence, including unavailable/unmapped outcomes, rather than implying all are native rendered markers. Original raw retention may be a valid disposition if stated exactly.
- E4: feature `verification.md` was absent and final full checks/browser/visual evidence were still being produced. The planning checklist pass is not final implementation acceptance. Durable public coverage/limitations and exact-revision outcomes remain required under T014; ignored raw evidence alone does not satisfy the public summary task.

These are current acceptance gaps during authorized ongoing work, not a finding that honest pending external observations must be invented. Physical Android and TalkBack remain pending. The corrected diagnostics location `test-results/content112/map-source-diagnostics.json` is present; the earlier `.local` path observation was only a location limitation.

Reviewer independently ran focused tests: root reconciliation/quality/comparator/weapon intelligence, 24/24 pass; map quarantine/WZStats/MapGenie/held-out alignment, 24/24 pass. Commands: `node --test tests/runtime/content-verification.test.mjs tests/runtime/site-quality.test.mjs tests/runtime/codmunity.test.mjs tests/runtime/weapon-intel.test.mjs`; in map workspace `node --experimental-strip-types --test tests/map-scope.test.ts tests/wzstats.test.ts tests/mapgenie.test.ts tests/x01-workbench-model.test.ts`. Full-suite and browser results are not inferred from these passes. Implementation acceptance remains OPEN pending repairs/evidence and re-review.

## T017/T018 convergence planning assessment

Independently read the appended T017/T018 against FR-004, the unchanged source/import contracts and the existing verification strategy. Planning gate remains PASS for these bounded adapter repairs; current task count is 18. No source authorization or settings change is required or approved by this assessment.

T017 covers reproduced optional-title drift, a bounded pure adapter, negative and foreign-map tests, preserved new identities/floors and explicit loot-item semantics distinct from operator spawns. Under FR-002's existing prohibition on invented source claims, absent titles may receive only transparent labels derived from admitted source category/place/item identity; no guessed item name, location, floor or operator-spawn relationship is justified. Malformed rows, duplicate/foreign identities and invalid coordinate/frame data remain subject to the unchanged import boundaries. Staged review/repeat requirements retain approval and duplicate protections.

T018 explicitly distinguishes wholly omitted optional sprite declarations from partial or unsafe declarations. Only the wholly absent case may reuse already admitted local icons or fallback, with an explicit warning; a missing icon is not a successful new artwork capture. Partial/unsafe declarations remain errors, and frame/public-access validation plus reference-only positioning remain required. Existing fixed-host, resource-limit and inert-import requirements still govern any declared assets, with no new arbitrary remote fetch.

No additional requirements blocker found. The parent-reported live row counts and source diagnostics have not been independently reproduced in this planning review: the suggested `.local/content112/map-source-diagnostics.json` path was absent when inspected. Implementation review must assess actual negative fixtures and staged provider outcomes; this planning acceptance is not an adapter safety test or provider-pass receipt. Final T011/T014 acceptance still requires these source regressions and staged/repeat outcomes under the general verification strategy.

## T016 convergence planning assessment

Independently reassessed appended T016 and its plan assessment on 2026-11-28. Prerequisites still select feature112 successfully. Approved implementation is now in progress; this assessment covers the new quarantine requirements only.

T016 adequately closes the old-snapshot acceptance path left after collector/current-capture repair: it covers source read, render and import boundaries; legacy and saved-source regression cases; original capture retention; private custom/reviewed record preservation; and the valid no-floor entrance. The plan prohibits a blanket prefix filter and requires an exact 63-ID registry supported by source evidence. The intended registry `tools/hajin-map/src/map/codcentral-x01-interiors.json` records the source URL, check time and explicit nonempty `data-floor` rationale. This is bounded source correction under FR-004/008, with no player-storage migration or recovery scope expansion.

No additional requirements blocker found. Planning gate remains PASS; current task count is 16. Final acceptance requires execution evidence that filtering is restricted to the affected provider's Hajin source records, preserves custom/reviewed and X01 records, is pure/nonmutating, and covers legacy/saved/import paths plus the valid entrance. These assess T016's written boundaries, not implementation correctness or independent verification of all 63 source identities. The plan's final map regression explicitly includes legacy and saved source paths.

## Scope and evidence

Owning feature: `112-content-verification`, branch `feature/112-content-verification`. Base and inspected HEAD: `09499d06c3c3ecbe67023e13341a5a649a631414`; planning is uncommitted. Reviewed intended new files: `spec.md`, `plan.md`, `tasks.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/verification.md`, and `checklists/requirements.md` under this feature. Reviewer writes only this report and `checklists/verification.md`. Unrelated `.playwright-mcp/` files were excluded.

Read repository AGENTS, README, constitution, Spec Kit cycle, pinned analyze/checklist instructions, dmz-review and workflow/domain/map guides. Prerequisite command `.specify/scripts/bash/check-prerequisites.sh --json --require-spec --require-tasks --include-tasks` passed and selected this feature. No `.specify/extensions.yml` exists. Analysis of requirements is read-only; this separate durable reviewer report is written under the explicit review assignment. No requirements, plans, tasks or implementation files were changed by the reviewer.

## Spec findings

| ID | Category | Severity | Location | Finding and exact repair |
| --- | --- | --- | --- | --- |
| I1 | Inconsistency | MEDIUM | tasks.md:8–10,18–20; spec.md:42–43 | Weapon tasks T003–005 cite FR004 (maps), while map tasks T009–011 cite FR005 (weapons). Change weapon references to FR005 and map references to FR004, preserving their other references. Use the canonical hyphenated FR IDs if convenient. |
| C1 | Coverage | MEDIUM | tasks.md:T003/T004; spec.md:25,43 | US3 and FR-005 require preferred MW4 and candidate DMZ comparator checks. Tasks explicitly exercise preferred-source proposal and patch parsing but never explicitly schedule the candidate DMZ route outcome. Add to T003 or a dedicated task: check both fixed provider routes, record separate actual provider/mode/coverage outcomes, retain untested or partial DMZ as incomplete, and prove it cannot replace the preferred baseline. |
| C2 | Coverage | HIGH | plan.md:phase5; tasks.md:T009–011; tools/hajin-map/server/source-collectors.mjs:275 | The collector extracts every `.dmzm-pin` without retaining `data-floor`; the owner reports the existing 487-marker Hajin capture includes X01 interior records. Current tasks address X01 hidden category and generic floor regression but do not explicitly remove this known wrong-map contamination from existing captures. Add a test-first task for collector map/floor isolation, rejecting/excluding interior floor records from Hajin while preserving the legitimate no-floor `x01-entrance`; include mixed-document/unknown-floor regressions and reviewed recollection or migration of affected local captures. Require a before/after identity disposition so removed interiors are explained and not lost from X01. Update plan and research with the finding and make final reconciliation depend on this task. |

C2's missing `data-floor` extraction is independently confirmed by reading the collector. The precise local capture count and current interior membership are owner-reported research, not independently recounted by this reviewer. The requirement-level gap exists regardless of that count.

## Standards findings

No separate documented standards violation found in the planning artifacts. Missing implementation evidence is expected at this stage and is not a pass. The cross-map issue is classified here as a planning coverage gap; implementation standards review remains separate.

## Coverage summary

Mappings below are semantic, highlighting incorrect literal references rather than hiding coverage behind the catch-all T014.

| Requirement | Has task? | Task IDs | Notes |
| --- | --- | --- | --- |
| FR-001 | Yes | T001,T008,T014 | Baseline identity/disposition accounting |
| FR-002 | Yes | T005–008 | Supported fields, artwork metadata and reconciliation |
| FR-003 | Yes | T006,T008 | Exact upgrade/recipe/Orders denominators |
| FR-004 | Partial | T009–011 | I1 references; C2 known mixed-map capture gap |
| FR-005 | Partial | T003–005 | I1 references; C1 candidate comparator gap |
| FR-006 | Yes | T012,T014 | Quantified layout/accessibility and actual captures |
| FR-007 | Yes | T012,T013 | Preparation/attempt separate from observed physical acceptance |
| FR-008 | Yes | T001,T002,T007,T013,T014 | Privacy, independent gates and deferred recovery |
| SC-001 | Yes | T001,T008 | Exhaustive finding disposition |
| SC-002 | Yes | T006,T008,T014 | Exact source outcomes and usable links |
| SC-003 | Partial | T003–005,T009–011,T014 | C1/C2 repair required |
| SC-004 | Yes | T012,T013 | External observations may remain pending, honestly |
| SC-005 | Yes | T014 | Independent implementation review still future |

No unmapped task, duplicate requirement or constitutional conflict found. Eight FRs and five SCs, 14 tasks. All 13 requirement/criterion entries have at least one semantic task (100% association); association alone does not establish complete acceptance coverage. Three actionable findings: one HIGH and two MEDIUM; zero CRITICAL. Fifteen reviewer checklist criteria assessed: 12 satisfied, three open.

## Decision and next actions

Planning review remains open pending C2's explicit repair/migration coverage, I1 traceability correction and C1 comparator coverage. The owner should edit the affected planning artifacts, then request independent reanalysis before implementation. No product clarification is needed to make these repairs concrete.

The specification appropriately preserves unknown game facts and full-game denominator limitations. An unresolved finding with a named reason is an honest disposition, not evidence that requested factual completion has occurred. Physical Android/TalkBack remains actual-observation work: unavailable connection cannot check T013 off. Neither this review nor future passing software tests can certify gameplay calibration, full-game completeness, physical usability or backup/recovery.

## Repair reanalysis — 2026-11-28

Independently reread the complete repaired `tasks.md`, `plan.md` and `research.md` and reran the required read-only prerequisites successfully; the feature selection remains correct. HEAD is unchanged and no implementation files appear in the working-tree change list.

| Finding | Status | Reassessment evidence |
| --- | --- | --- |
| I1 | Resolved | T003–005 now cite weapon FR005 and T009–011 cite map FR004; new T015 correctly cites FR001/004/008. |
| C1 | Resolved | T003 explicitly checks both fixed MW4 and candidate DMZ URLs, requires separate mode/date/coverage outcomes, and forbids partial untested DMZ promotion. Existing US3/contract assertions retain preferred-baseline protection. |
| C2 | Resolved | New T015 names collector/test owners, requires a reproduction before repair, excludes nonempty shared/unknown floors from Hajin, preserves no-floor `x01-entrance`, uses staged active-capture recollection, records every removed interior ID's X01 disposition, preserves private state, and prevents repeat contamination. T011 and final map/audit work depend on T015; plan phase5 and research now include the issue. |

Updated coverage: 15 tasks, eight FRs and five SCs; every requirement/criterion has semantic task association and no identified remaining acceptance-coverage gap. No new ambiguity, duplication, unmapped task or constitutional conflict was found in the repaired artifacts. All 15 reviewer checklist criteria are now satisfied. Open findings: zero.

Planning implementation gate is satisfied. Implementation, actual source checks, independent implementation review and physical-device observation remain future work under their existing evidence requirements. This review does not check off execution tasks or convert pending facts into completed user outcomes.
