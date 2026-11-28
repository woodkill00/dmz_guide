# Independent implementation review — accepted locally

**Current verdict, 2026-11-28:** local implementation accepted; zero open standards/spec/visual findings and no further buildable convergence tasks. Earlier provisional sections below preserve review history and are superseded by the final decision at the end. Hosted exact-head CI, publication and final local build identity remain separate gates; dedicated backup/recovery testing remains deferred.

Reviewer: `/root/reliability_review_111`. Baseline `000fb7ffb913395c26e5f71a892962b914474d18`; current feature111 tracked diff and intended new source/tests/docs reviewed. Private `.local/` backups, browser profiles and personal files were not read. Review writes only this receipt.

## Standards findings

No blocking standards finding in the scoped CI split or camo quality extension. Existing strict catalog validation, bounded quality index/review bindings, finite weapon/camo reader routes and admitted specialized editor targets are retained. Source placeholder checks do not invent requirements. CI preserves original commands and both OS variants, immutable action pins, uniquely named artifacts and always-evaluated fail-closed old runtime-check names. Aggregate intentionally waits for all dependency OS variants.

## Spec findings

| ID | Severity | Location | Finding and reproduction | Required repair |
| --- | --- | --- | --- | --- |
| R1 | MEDIUM | scripts/content-audit.mjs, summarizeContent navigationPagesWithRoster | Global Hajin chapter rows are counted for every pack containing any public Order, without intersecting that pack's visible objective IDs. A synthetic pack containing only one X01 Order yields Hajin navigationPagesWithRoster24 despite zero Hajin objectives. Missing/protected/unrelated rosters can be falsely counted as covered. | Intersect reported sequence with that pack's visible matching-map identities; add X01-only, partial and protected roster regression cases. |

## Harness assessment

The new root-font-size test correction is justified: existing mixed rem/vw fluid headings need not double exactly when root font size changes. Measured body/control16→32px, growing/unclipped headings and surrounding reflow/focus are valid assertions for this probe. This does not independently certify browser text-only zoom or formal WCAG compliance. No pre-existing oracle or product style was changed to satisfy the new test. Async Order click followed by committed-state assertions likewise matches deliberate pending-save presentation better than Playwright check()'s immediate state postcondition.

## Independently executed checks

`node --test tests/runtime/site-quality.test.mjs tests/runtime/content-audit.test.mjs tests/runtime/ci-quality-contract.test.mjs`:8/8 passed. Earlier CI-only review independently ran2/2 contract tests and compared original commands/OS/artifacts against main. R1 reproduced with a read-only synthetic in-memory summary invocation; no private or production state changed. Passing current tests do not cover R1 yet.

## Remaining acceptance

Provisional, not accepted. R1 repair/retest is required. Family1's promised inventory→Needed→Quick collect/Add found handoff is not covered by the new runner's collection-needs suite alone (that suite never opens Needed or Quick collect); execute/add the actual cross-page check in all three engines and record it. Full five-family three-engine evidence, all selected expanded/narrow/keyboard/Axe checks, actual screenshot review and final repository/runtime/build/map results remain in progress. Hosted CI is not claimed by this review. Dedicated backup/recovery acceptance remains deferred until last.

## Follow-up review — R1 resolved; evidence gates remain

Re-read repaired summary and regression cases. R1 is resolved: each navigation row must intersect the current public pack's visible IDs in the matching map set. X01-only reports no borrowed Hajin roster; adding one public Hajin identity yields one row; protecting it removes it again. Independently reran quality/content/CI focused suites:9/9 passed, including new X01-only/partial/protected cases. No further source finding in this scope.

The reliability runner now explicitly saves Control Unit2, verifies Needed28 and Quick collect28, adds5, revisits Inventory7 and Needed23. This closes the earlier missing-assertion coverage gap; final engine receipts still gate execution acceptance.

Independently confirmed WebKit screenshot exclusion predates this feature in main's docs/release.md. Current runner skips only WebKit screenshot calls, preserving all functional/state/computed-layout assertions and strict health/CSP checks; Chromium/Firefox retain captures. This is an accepted harness-policy alignment, not a product fix or a skipped functional scenario. Do not claim WebKit visual capture or physical Safari certification.

Provisional status remains pending final screenshots, complete current engine/map/UI results and exact final source/evidence review. No private backup contents were read.

## Visual and reconciliation review

Viewed actual current synthetic/public captures: `test-results/card-reflow/chromium-m4-card.png`, `chromium-dashboard-compact.png`, `firefox-collect-dash-upgrade.png`, `webkit-item-row-200.png`, plus `test-results/reliability/chromium-quality-200.png` and `firefox-quality-200.png`.

No blocking visual finding in these six captures. Narrow weapon card controls move to separate rows with visible labels/count/manual actions; camo/prestige text, disclosure and Done controls remain contained. Synthetic long item/acquisition names wrap within cards with readable count/status rows.200% item-row actions and Build/get remain distinct and contained. Enlarged quality pages stack controls/menus legibly without document overflow; the genuine2D table is visibly bounded rather than squeezing every column. Its offscreen columns require the existing horizontal-scroll/keyboard region, so these pixels alone do not prove those interactions; owner-suite assertions remain required.

Inspected the new WebKit reconciliation wait: it requires an existing checkbox and the expected actual unchecked UI state, then asserts that state. It follows the independent committed-profile check, uses the unchanged default timeout and does not replace UI verification with storage-only truth. This is a sound async-lifecycle harness correction. Current full engine evidence still determines whether it passes; no product behavior was weakened.

Visual sample accepted; overall acceptance remains provisional pending remaining current map, sitewide/WebKit, Python and final convergence receipts. The user's dedicated backup/recovery verification stays deferred.

## Convergence additions T012/T013 — source review

T012 is an appropriate settled-layout harness repair: the existing UI suite now waits for non-loading Hajin source slots and ready workspace, then network idle before navigation/reload/layout assertions. The readiness condition is bounded by the existing default wait and preserves every prior assertion, strict browser health and explicit network-idle deadline. It does not add an error allowlist or certify source accuracy from a ready shell.

T013 uses the existing optionalCamoArtwork policy, without changing the health monitor: registry-derived exact same-origin image URLs, GET/image404 only, bounded response/console observations. CSP/script/unrelated errors retain fatal handling. The new test forces one known swatch404, waits for the actual image-hidden fallback and continues all camo/manual/dashboard progress checks. This is necessary for clean checkouts without ignored local art and is distinct from allowing unknown broken resources. No functional scenario or production assertion was removed.

No new standards/spec finding from T012/T013. Parent reports current runtime1,247/1,247, all-engine compact/reusable/component/service checks, full map confirmation/Safe Run and Loot Run passes; final verified receipts still must reconcile initial failures and exact rerun outcomes. Review remains provisional pending serial Python, final missing-art/WebKit run, clean final build/link evidence and convergence completion. Private data and recovery testing remain excluded.

## Final standards/spec review and convergence

Reviewed resulting current source, tests, documentation, spec/plan/tasks/contracts/matrix and actual receipts, including intended new files. Pinned convergence prerequisites verified for feature111. Convergence assessed present implementation against the intent inventory, separately from baseline-diff standards review. Checked8 functional requirements,5 success criteria,5 story acceptance blocks,7 plan phases,10 constitution principles and all15 existing tasks. No missing/partial/contradictory/unrequested buildable work remains; no new convergence tasks appended and tasks.md was left unchanged by the reviewer. T011 can be marked complete by the implementation owner.

R1 is resolved by current-pack/public/map identity intersection. R2 is resolved by marking clean Orders stale on departure and using existing read-only canonical reconciliation. R3 is resolved by guarding absent pack/profile during early return; the exact independent held-init probe that previously raised null-id now reports no errors. Inspected both deterministic lifecycle regressions and all3-engine green receipts. The real native-navigation revision4 observation is correctly recorded separately from the independently proven cached-return defect; strengthened saved-revision+acknowledged-UI preconditions retain all downstream assertions and pass four isolated WebKit repeats plus final three-engine journeys.

Verified current final guide receipt `guide-final-ack.log` and `journeys-all.json` completedtrue with no failure; all3 engines cover actual inventory/Needed/Quick collect quantities, weapon/dashboard/camo/manual parity, acknowledged Order reopen and both return lifecycles with forced optional-art fallback. Read full map confirmation statuses for Chromium/Firefox/WebKit and retained failure history; Safe/Loot, settled sitewide UI, component/service and card evidence reconcile with verification.md. The broader planned sweep was actually executed: `ui-sweep-final.log` reports38 route/viewport cases PASS. Earlier reviewed six captures remain valid for this non-layout source repair; no new blocking visual finding.

Local runtime evidence is accurately bounded: full1,247-case run passed before later lifecycle repair; current affected mission/Order49, quality/content/CI9 and health14 pass afterward. Python full runs passed78 with one existing60s build deadline failure; the unchanged exact isolated reproducibility case then passed in473.362s with fixed quiet inputs. This is coverage across runs, not a claim of one green79-case invocation or a weakened deadline. No failure was deleted or represented as a pass.847 quality reader links and1,264 finite editor targets have zero reported failures. Actionlint and current repository/format/skill/whitespace checks are recorded with their actual limits.

No private backup/profile payloads, personal screenshots, credentials or game-data inventions are introduced in reviewed public paths; private capture remains excluded from tracked files. No profile/schema migration, live restore, accounts/sync, deployment or public launch added. Final documentation identity build/startup and hosted exact-head workflow results must be recorded after publication steps actually occur; this acceptance does not pre-certify them.

Reviewed critical source fingerprints (SHA256):

| Path | SHA256 |
| --- | --- |
| src/client/progression.mjs | bda6bb079124527d5a5a9146409d7427582f9833b7673d4e2b5084af3cf448e2 |
| src/domain/site-quality.mjs | 7bf26f4e6c908077be51f5919e1f84bd6667b6306f8a50b122a8994d6565a39e |
| scripts/content-audit.mjs | 7e6a1dc677169dcdc29f9802fb146b4e040b0ab4a1f39b629f9681dbb4cbb589 |
| .github/workflows/quality.yml | ce254e201264b1bc80d75b53ff0ce60f962e45615fb1b1b56c108a5fc97c85e0 |

**Decision:** accepted for local implementation completion. Zero open review findings; converged with no additional buildable tasks. Preserve the explicit final separate backup/recovery workpackage and actual publication gates.
