# Acceptance — 051 CODMunity baseline

Implemented on 2026-11-01 in `feat/051-codmunity-baseline`. Manual pinned Spec Kit lifecycle: research/clarify, reviewed definition/contracts, implementation, analysis/repair, verification and independent convergence. No automated Spec Kit command execution, remote publication or gameplay validation is claimed.

## Delivered scope

FR001/002: the fixed CODMunity MW4 comparator is the preferred numerical baseline in Gunsmith summaries, source tables and the workbench comparison. Accepted live data has 19/33 known weapon rows and 18/33 damage profiles. Eight body regions, source bands and provider calculations retain unknown units/target assumptions. Every preferred report carries the requested `*WZ` marker with explicit actual Multiplayer/not tested in DMZ attribution. Official, older community and private observations remain separate.

FR003/005: the DMZ comparator currently reports eight known rows, zero damage profiles and NOT TESTED YET IN GAME. Reachability is not readiness. The CLI dashboard probes at startup and every six hours while running; manual probing is available. Monitoring updates status only, is serialized with updates, retains last success on failure and stops with its owning service. No offline or OS schedule exists.

FR004: fixed bounded fetching and inert SSR literal parsing stage exact reviewable proposals. Hash/revision-bound apply validates under exclusive ownership, retains a backup and replaces atomically. Normalized no-ops preserve accepted bytes. Failures preserve accepted and staged data. Removals and coverage loss remain explicit review changes. Reader/build/test paths do not fetch sources.

## Verification

- `npm test`: **733 passed, 0 failed**, no skipped/cancelled/todo; `.local/codmunity051-runtime.log` (108264 ms). Includes eight new parser/pipeline/monitor lifecycle tests and existing manager/build/storage gates.
- Three engines (Chromium, Firefox, WebKit): source UI and disposable real CLI check/review/apply/no-op/probe workflows, 24 reader and eight manager responsive/text layouts per engine; final strict browser health PASS, `.local/codmunity051-engines-final.log`.
- Affected 048 armory and 049 workbench regressions: three engines, 48 and 40 layouts per engine with functional/private storage/import/recovery checks; `.local/codmunity051-regression.log`.
- Accessibility: **32 scans, zero violations** across roster/detail/workbench/manager, 320/1440 widths, light/dark and 200% text, WCAG2A/AA/2.1AA; `.local/codmunity051-axe-final.log`, `test-results/codmunity051-axe.json`. Initial failure was keyboard access to scrolling proposal text; both review blocks now have tabindex=0. Earlier failed scan is not counted as a pass. Axe injection used a dedicated CSP-bypass browser context; normal functional browser tests enforced CSP.
- Repository checker: zero failures; formatting PASS; static build **830 independent routes plus 404**; map build PASS with existing bundle-size advisory. Logs `.local/codmunity051-check.log`, `codmunity051-format.log`, `codmunity051-build-final.log`, `codmunity051-map-build.log`.
- Actual local dashboard check of both live sources repeated after final import: normalized unchanged, accepted SHA unchanged, no apply needed. Startup probe and enabled six-hour policy verified; `.local/codmunity051-live-receipt.json` and `codmunity051-live.log`. No session token captured.
- Current build source hashes match all **126 observed source files**, including accepted CODMunity content; `.local/codmunity051-tested-sources.json`. This is observed source equivalence, not a signature or gameplay verification.
- Actual detail and manager screenshots inspected: `.local/codmunity051-detail.png`, `codmunity051-manager.png`. Preferred values/source dates, damage table, separate unready DMZ status, bounded review and no-op disabled apply are visible. These local receipts/art remain ignored.

## Repairs and limits

Independent review found three issues and repairs were reproduced: generic untested wording, older probe overwriting newer status, and preferred numbers captioned with the official launch date. Shared writer serialization/monotonic status, broader inert warning detection and actual preferred source/date attribution resolve them. Raw profile zeros remain reported; empty-profile zero placeholders are omitted. Unknown data remains unknown; only 18 current damage profiles exist, provider calculations are unverified in DMZ and future source layout changes can require parser maintenance. Existing local collection permission applies; no public asset/data license is asserted.

Independent final acceptance is recorded only by the reviewer in `checklists/requirements.md`.
