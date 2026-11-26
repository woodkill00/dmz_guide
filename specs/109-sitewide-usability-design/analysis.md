# Analysis — planning cycle

## Pass1 — self-assessment

Scope: spec, clarifications, research, plan, tasks and validation only. No application implementation or new application acceptance suite has run for109.

- **A01 resolved in owning artifacts:** forcing calc onto every CSS literal does not establish responsive behavior and can harm semantic geometry. FR02/clarifications/plan now require shared calc-backed layout arithmetic, bounded intrinsic flow and enumerated exceptions. Actual computed behavior, not calc occurrence count, is the gate.
- **A02 resolved in owning artifacts:** site-wide cannot mean only default guide pages. FR01/validation cover every registered route plus map variants/floors, nested tool/editor/recovery states and aliases. T04 must generate exact inventory and close unclassified entries.
- **A03 resolved in owning artifacts:** compactness may damage accessibility. FR07/FR13/FR14 set scroll/text/target/focus conditions, with normal and comfortable density and real zoom/text-spacing coverage.
- **A04 resolved in owning artifacts:** current feature108 is dirty. T03 requires a preserved checkpoint and isolated implementation checkout; this plan does not claim a feature109 branch is already active or move existing changes.
- **A05 resolved in owning artifacts:** wide test matrices can imply unexecuted assurance. Validation tiers distinguish all-route/feature coverage from state-family combinations, require case inventory/receipts and explicitly retain unavailable/not-run checks.
- **A06 resolved in owning artifacts:** phased CSS removal could orphan legacy/modern shells. T04/T07/T24 map import/selector owners and retain existing071 rollout/lifecycle contracts until each consumer has matched verification.

Pending: independent planning consistency review and any owning-artifact repairs. Implementation tasks remain unchecked. All application performance thresholds await measured T05 baseline and recorded budgets; no app issue count or universal-perfect-sizing claim is made.

## Pass2 — independent findings and owning-artifact repair

- **P2 A07 repaired:** complete requirement universe is FR01–FR18. Full-scope task ranges now cover18; explicit FR17 verification and FR18 rollout/documentation owners and exit gates are recorded in tasks.md. Consistency validation uses18 as the denominator.
- **P2 A08 repaired:** mandatory map scenario incorrectly promised retention across all filters/saves. validation.md and plan.md now distinguish passive pan/zoom/resize/noninvalidating repaint from explicit dataset/source/filter/deletion/context invalidation, preserving existing owner guards rather than redefining selection semantics.
- Linked reviewer files now exist; author checks cover local links and32 unique task IDs. Final independent recheck pending.

## Pass3 — independent recheck and closure

Independent reviewer reports planning READY; USABILITY-01/02 are closed and reviewer-owned checklist completed. All18 requirements and32 task definitions reconcile; dependency graph is acyclic and local document links pass. No confirmed blocking planning issue remains. This is not an application implementation/test verdict. T03–T31 and their baseline/rollout/acceptance gates remain future work.

## Implementation repair cycle

2026-11-27 premerge closure: the complete local map browser suite passed with zero runtime errors/external requests, and all three full Studio engines passed. Subsequent CI diagnosed a real Save-and-refresh race: public operation status correctly becomes unresolved while a background checkpoint owns the repository lock, but refresh used that public probe as an admission verdict. Refresh now uses a private receipt inspection under its own repository snapshot barrier; public status and interrupted-save recovery remain fail-closed. An actual saved-operation/held-snapshot regression proves no early build, one admitted refresh and unchanged canonical revision; all11 affected runtime tests and all three editor-experience engines pass. Full runtime rerun and final-head CI remain required. Guide handoff fixtures now decode exact same-origin destinations, distinguish same-origin guide/map health from optional companion ports, and preserve all original identity/no-write checks. Linux enlarged-text camo headings wrap without clipping; fixture diagnostics identify any remaining overflow. No physical-device pass is inferred.
Independent USABILITY03/04 repairs preserve embedded navigation reopen controls after DOM reparenting and measure actual pinned offsets. Browser checks exposed and repaired a320px/200%-text dashboard heading overflow and a fixed migration notice obscuring map actions. Independent visual review identified compact missing-image labels and overlapping legacy mobile toolbars; repairs are undergoing matching browser/visual rechecks. Full runtime's isolated navigation VM is updated for the new layout initializer; real DOM behavior is covered separately. Final implementation analysis remains open while acceptance evidence completes.

## Premerge repair cycle — 2026-11-26

PR41 is pushed as a draft. Chrome and Firefox full Studio suites passed; WebKit's concurrent save timed out with its draft retained. A complete isolated WebKit rerun is required; contention is a hypothesis, not a confirmed cause. Physical-device checks remain explicitly unrun.

CI found reproducible mobile search-title visibility and tracker/tool overlap failures (FR07/FR10/FR14). Search grid metadata now follows the result title, preserving all fields and actions. Default tracker placement measures overlapping top tools and lower launchers; saved user positions retain their owner and are reclamped. Verify the existing full map-engine suite plus default/drag/reset/short-height boundary checks before closing these findings.

Legacy armory/Gunsmith fixtures assumed a single, initially closed weapon disclosure. They now target the direct summary and open only when needed; the same filtering, navigation and layout assertions remain. Node24 compatibility now installs the map toolchain already required by unified-server runtime imports. These are test/provisioning repairs, not removed coverage. Dynamic page-editor refresh had one CI WebKit timeout; fresh local three-engine reruns passed without changing production behavior, and failure diagnostics now include refresh status. CI recheck remains mandatory.

The next CI pass reached older downstream assertions: mission-directory fixtures incorrectly required every mission collapsed despite the approved earliest-page defaults; Home journeys expected the removed attachment-directory link and separate5175 service; WebKit checked dirty checklist history before restoration settled. Fixtures now assert first-page defaults, the unified Attachments tab, the current three-port service allowlist, and the exact original boss URL plus retained original dirty field after restoration. No completion, quantity or domain assertion was removed.

Broader popup coverage reproduced an8px notes viewport at360x800: the legacy mobile grid reserved both toolbar rows during a popup. Mobile popups now temporarily remove those rows from allocation and restore them on close. The original short-body no-scroll assertion waits for the actual post-allocation geometry; long-body keyboard/wheel, inert text, native actions, viewport bounds and preserved detail behavior remain required. Focused popup and three-engine mission instruction checks pass; full current suite and CI terminals are still required.
