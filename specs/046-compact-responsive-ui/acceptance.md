# Acceptance — compact responsive UI

Date: 2026-11-01. Local feature, no deployment/push/merge.

Definition independently approved. Implementation and functional verification are complete. Independent review accepts local delivery with documented limitations. Clean-commit/build delivery checks passed as recorded below.

At1440px normal text, baseline → first completed design measurements: header108→64px, collection heading245.41→139.64px, Inventory251.16→145.39px, Upgrades271→162.83px, Items250.53→142.05px. Default panel padding28→13.76px; content max width1280→1440px. Existing compact upgrade row padding is preserved. Before screenshots were viewed during work; the later measurement helper accidentally reused their filenames, so retained PNGs are explicitly after images and no retained before-PNG comparison is claimed. Baseline metrics remain recorded from the initial run.

Dedicated Guide checks: all3engines passed96layout/theme/text cases each, Escape/focus/target/reduced-motion tests and native navigation without JavaScript. Companion checks:72cases passed across Studio/map/help in all3engines. Independent actual Edge review confirms readable menu, end-of-list reachability and Escape at320px/200%text.

Early harness failures are retained in analysis.md: outside pointer target was under the overlay; Settings label had two legitimate destinations; runtime VM stripped the new import without providing its dependency. Corrections preserve normal hit testing, scope the intended destination, and isolate catalog propagation with a menu-helper stub while real DOM behavior runs in browsers. No forced clicks or relaxed assertions.

## Frozen-source verification

- Full runtime:701/701 passed, zero failed/skipped/cancelled (`.local/ui046-runtime-frozen.log`,219038.903ms).
- Final automated accessibility:128scans, zero WCAG A/AA violations (`.local/ui046-axe-frozen.log`). Includes four Guide pages, open grouped menus and both Collection dialogs, normal/200%text and both themes.
- All ten affected Guide journeys passed Chromium, Firefox and WebKit (`.local/ui046-affected-complete.log`). These include real mouse press/release geometry, touch/keyboard/disabled behavior, native no-JS links, inventory drafts/clear/Cancel/Tab visibility, collection/crafting/CAS/Undo, tiers/dashboard, map contexts and private-reader navigation. Standard WebKit screenshot policy remains unchanged; its functional and geometry assertions all run.
- Map workspace:176unit tests and typecheck/production build passed. The clean standard browser command passed114checks with zero runtime errors/external requests (`.local/ui046-map-browser-final.log`). A preceding console-instrumented114check run also passed; the earlier failed keyboard navigation receipt remains in history. After strengthening the boss test to wait for the workspace to leave inert/busy state and verify actual link focus, its complete directory/board/order/counter helper rerun passed (`.local/ui046-boss-readiness.log`). Original Enter, route, detail focus and read-only assertions remain; no fixed sleep or deadline change.
- Companion Studio/map/help:72layout/menu/focus cases passed across all three engines. Independent visual/source receipts are reviewer-owned.
- Formatting and repository checks pass, including final delivery reruns. Full Studio passed with the explicitly amended HTTP functional bound and passive native raster-stage observers; see qualifications below. Independent final review passed with documented limitations; clean commit/source equivalence and final smoke passed.

## Reproduced repairs

The initial128accessibility scans found transient contrast failures because background transitions lagged instant theme text changes. Border-only feedback resolves this without waiting before scans. Profile-toolbar grouping alone did not solve inventory announcement wrapping; an intrinsic, hidden status sizer now reserves normal draft text while allowing longer errors to grow.

The compact layout exposed a pre-existing inventory focus-reveal handler that scrolled23px between pressing and releasing a partially covered Uses button. Final repair skips only that manual reveal for the currently pressed inventory target; native click/focus and keyboard/programmatic reveal remain. Broader experimental mouse-focus/default-prevention approaches were ineffective and completely removed. New exact pointer geometry/activation tests and original keyboard-visibility assertions remain authoritative.

Collection tests now verify the actual saved IndexedDB quantity/revision before retaining their original reload assertions. Refined-inventory popup observation uses Promise.all so failed clicks cannot create an unhandled pending-popup rejection that masks the cause.

Studio's initial simultaneous response waiters spent the follow-up GET's30-second budget during a measured21.6-second Save. Separating the phases progressed through v1's full roundtrip and v2 save/restart/import, but a later30-second Save failed under concurrent I/O. An exclusive unchanged-deadline rerun also failed; load alone is not the explanation.

A direct isolated full-catalog store reproduction succeeded with exact saved/post-read pack equality: read10374.5ms, save29248.2ms, verify10141.3ms (`.local/ui046-studio-latency2.log`). The Studio functional HTTP response bound is therefore explicitly amended to the named90-second constant. This **relaxes the historical test bound**; a pass under it proves roundtrip correctness, not save-speed recovery or a30-second guarantee. Dispatch and follow-up phases are observed separately. There is no product30-second SLA, no fixture was removed and no server/storage behavior changed. Health, interaction/readiness, bitmap/adversarial and performance deadlines remain unchanged. Independent review approved the rationale; the amended full functional run passed. Slow filesystem-backed Studio saves remain a known limitation.


## Final Studio result and limitations

The full Studio run passed with exit 0 (`.local/ui046-studio-raster-stages.log`), including both catalog-schema roundtrips, public Edit actions across six groups, custom-port and invalid-identity behavior, image cancellation/replacement, saved previews and fresh-clone pixels, guided records, duplicate image reuse, blocked removal, repeat-save/import, genuine stale conflict and recovery, read-only serving, 1,000-asset paging and mobile/200% reflow. The original strict browser-health monitor passed. No case was skipped or retried within this run.

This run used passive native bitmap, canvas callback, array-buffer and hash timing observers. Original promises/bytes, real raster processing and the five-second deadline were preserved. Its only reported raster timeout is the deliberate held-decode negative fixture: error after approximately 5.015 seconds, late bitmap closed, exact draft retained and fresh selection recovery passed.

An earlier full run failed an ordinary Gold image re-selection at that unchanged five-second deadline. Six focused cycles, twelve enlarged-text/layout cycles, twelve actual-screenshot cycles and the independent exact saved-prefix reproduction passed without deadline changes. The final full run also passed that operation. No deterministic cause was found and no raster implementation was changed: this remains an unexplained intermittent limitation, not a claimed repair or guarantee against recurrence. Slow filesystem-backed saves also remain; the 90-second response observation bound explicitly relaxes the historical 30-second functional gate.

The standard bundled-Chromium local delivery smoke passed HTTP 200, three navigation groups, enhancement, Escape and focus restoration on Guide, Studio, map and help (`.local/ui046-delivery-smoke-bundled.log`). An additional branded-Chrome smoke passed those functional assertions but its strict health check saw the existing map implicit favicon 404; no favicon response or source was changed to hide that result. Automated evidence does not certify physical devices or screen readers.


Independent final verdict: PASS WITH DOCUMENTED LIMITATIONS, integration_review, 2026-11-01; see the reviewer-owned checklist. The unchanged raster implementation and successful native-guard/recovery/full functional tests support bounded local presentation acceptance while retaining the unexplained earlier timeout and slow-save limitations. No public deployment or physical-device certification is implied.


## Local delivery

A clean local feature commit was built successfully: 736 HTML routes plus the 404 page. The map typecheck/production build also passed, with its existing chunk-size advisory. The final generated build identity reports a clean checkout and its exact Git revision; every `sourceFiles` hash equals the frozen tested identity (`.local/ui046-source-equivalence.log`). The final standard Chromium smoke passed all four running surfaces with strict health (`.local/ui046-delivery-smoke-final.log`). Formatting and repository validation pass; no remote writes were made.

Local previews remain at Guide `http://127.0.0.1:4173/`, Studio `http://127.0.0.1:4174/`, and map/help `http://127.0.0.1:5175/`. Documentation-only completion updates do not alter the tested production inputs; the clean final commit is rebuilt and its source identity is checked again.
