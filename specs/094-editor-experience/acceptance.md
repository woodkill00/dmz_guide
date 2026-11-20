# Acceptance evidence — editor experience

2026-11-19 · Windows11 · Node24.15.0 · Python3.14.4 · feat/094-editor-experience. Implementation and verification complete; independent aggregate disposition is recorded in final-review.md. Existing staged093 is retained. No commit, merge, deployment or public account authorization is claimed.

## Delivered behavior

| Requirements | Implementation and evidence |
| --- | --- |
| FR01–03 / US1 | Visible item Edit action; Content/Layout/Photos; preview selection; Order task controls; friendly labels/reference search; remembered bounded panel sizing/collapse and mobile tabs. Order+Item journey and exact public-link suites. |
| FR04 / US4 | Five templates, custom-only reusable layouts with import review/fresh IDs, outline search/multi-selection/batch controls and keyboard alternatives. Pure validation and main/adverse browser journeys. |
| FR05 / US4 | Picker/drop, normalized eligible-image library, visual/numeric crop, quality feedback, placement captions/alt. Main journey verifies320×180→160×90 pixels, reuse without duplicate asset; existing media suite covers import/recovery/undo and stale callbacks. |
| FR06–07 / US2 | Linked field errors, readable bounded leaf diffs and explicit version suggestion; editing expires review/import/restore. Canonical planner and source restrictions retained. |
| FR08 / US2 | Independent Save and fixed reader-refresh job; same-attempt dedup, explicit new-ID retry, timeout/concurrent-instance/shutdown/restart handling. Main browser fixture deliberately fails first build then succeeds on retry without a second canonical save. |
| FR09–10 / US3 | Transactional newest-five saved snapshots, current+previous CAS disk checkpoints including unattached PNG, comparison and explicit restore-as-draft, conflict/export/clear. Main browser switches isolated browser contexts and restores pixels; adverse tests hold replies across owner changes. |
| FR11–12 | Exact adapter identities, source ownership, private inventory/completion separation, inert imports, finite safe paths/capacity and original canonical operation/recovery protocol retained. Three-engine tests, runtime/build/release gates and independent review. |

## Executed receipts

Ignored local logs/screenshots are under `test-results/`; these are local runs, not GitHub workflow results.

- `npm test`:1099/1099 PASS, zero failures/skips/cancellations;500223.1773ms (`094-full-runtime.log`). Includes actual failed build write/copy/promotion/source validation and old-reader preservation. This aggregate was executed before the last junction regression was added; backend production bytes did not change afterward.
- `node --test tests/runtime/editor-experience.test.mjs tests/runtime/page-editor-tools.test.mjs`:12/12 PASS, zero failures/skips/cancellations (`094-tools-runtime.log`). Includes >1MiB unattached normalized PNG, token/origin authority, junction refusal, CAS/retention/replay/quota, fixed-refresh retries/concurrency/timeout, queued shutdown and dead-owner restart.
- `node tests/browser/page-editor-experience.mjs`: Order+Item journey PASS Chromium/Firefox/WebKit (`094-experience-browser.log`): forms/tasks/live preview, templates/patterns/batch controls, crop/library, different-browser checkpoint, saved revision→draft/Undo, failed-refresh→retry without duplicate Save,320–1920px/200%, dark/light accessibility.
- `node tests/browser/page-editor-experience-adverse.mjs`: PASS Chromium/Firefox/WebKit (`094-experience-adverse.log`): old valid/invalid layout reads, held committed checkpoint success/failure after persisted lifecycle replacement, checkpoint/history comparison ordering and invalidation on edit/lifecycle, missing-image restore refusal.
- `node tests/browser/mission-chapter-links.mjs`: PASS all three engines (`094-chapter-links.log`):29 chapter routes, Hajin/X01 chapter edit/save/reload,390px and exact individual Order identity.
- `node tests/browser/all-page-edit-links.mjs`: PASS all three engines (`094-all-page-links.log`): six saved types plus weapons, private-copy distinction, maintenance and specialized entrypoints.
- `npm run build`:2108 routes plus404 PASS (`094-build.log`). The final matching source snapshot was rebuilt through the actual local UI refresh below, then packaged and verified.
- `npm run format:check`: PASS (`094-format.log`); `py -3 scripts/check.py`:0 failures (`094-repo-check.log`). Repeated after final documentation closure with the same passing results.
- Root reader4173 and restarted author4174 live, read-only Order→visible Edit→Content journey PASS across320–1920px (`094-live-smoke.log`). Screenshots `page-editor-094-live-desktop.png` and `page-editor-094-live-mobile.png` inspected; no canonical or player data changed.

- `node tests/browser/page-editor-run.mjs`: all12 PASS terminals (core, media/accessibility, save-recovery, ten-adapter journeys × three engines) in `094-editor-compatibility.log`.
- `py -3 -m unittest discover -s tests -v`:79 tests OK,544.700s (`094-python-complete.log`). Includes unchanged positive/negative repository assertions and actual independent-build/archive reproducibility. Focused repository fixtures15/15 OK,161.073s (`094-repository-fixtures-final.log`). Earlier copying-heavy runs were interrupted and are not passes; T012 excludes known generated/private directories from fixture copies.
- Real local browser **Refresh current repository** → fixed Node build → durable succeeded status and same-request replay PASS (`094-live-refresh-ui.log`), leaving the page Ready with no canonical Save or private-state writes. This final live build includes the T013 source delta; the earlier `094-build.log` is a prior build receipt.
- T013 main browser coverage forces the precise409/REPOSITORY_BUSY on the first status read and asserts successful polling retry in all three engines. The latest adverse runner also holds a status GET beyond the15s fetch/body deadline, verifies visible timeout and unchanged canonical revision in all three. Other errors never trigger Save or POST replay.

- Final `py -3 scripts/package-release.py` and `py -3 scripts/verify-release.py`:2412 fully inventoried payload files, clean extracted hashes/native links/owned Node child/exact content PASS (`094-package.log`, `094-release-verify.log`), after the T013 real-UI build. Author-only modules and private recovery state are excluded.

All named local execution gates are complete. Independent aggregate acceptance is reviewer-owned in `final-review.md`; this document does not approve a merge or claim GitHub CI ran.

## Review/fix cycle and convergence

Planning analysis2 READY after EDITEXP01–03 were repaired. Independent implementation findings EDITTOOLS01–04 are closed in reviewer-owned `final-review.md`: shutdown admission ownership; stale checkpoint callbacks; stale pattern reads; stale checkpoint/history comparisons. Each has source repair and reproduction-based test evidence. Compatibility/visual testing additionally repaired stale task-array insertion references, image button accessible names, preview block group semantics, WebKit navigation checkpoint timers and duplicate outline checkboxes; keep their regression oracles.

Convergence skill applied against active094 with prerequisite JSON resolving this feature. Initial comparison found no new product requirement beyond T010/T011 verification. Verification then exposed T012 fixture copying cost and T013 real-refresh status contention; both were appended, implemented, independently reviewed and reproduced. Final comparison finds no additional unbuilt requirement or duplicate task. All implementation/verification tasks have executed receipts; independent review remains the separate owner of its final disposition. Documentation/source scope has no planned public auth, Git automation, account synchronization or private-state migration.

## Limits and recovery

Owner follow-up FR13 (mission instructions) was implemented after the aggregate snapshot above. See [mission instruction repair](mission-instructions-repair.md) and the appended independent final review for current focused runtime/three-engine/build/live receipts. The older aggregate and release package were not rerun for this amendment.

Local author service only. Browser recovery and checkout disk state are not inventory sync/backups. History keeps five snapshots and may refuse unavailable source imagery; checkpoints/history/refresh payloads share256MiB/4096-file limits. Eligible normalized pictures retain existing2MiB/2048px and8MiB recovery caps. Refresh uses the existing fixed static build and can take several minutes; last good reader remains on build failure. Disk checkpoints/history are ignored and not committed. Read `docs/page-editor.md` for use and recovery.
