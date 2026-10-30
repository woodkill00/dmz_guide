# Local acceptance evidence

Feature036 is a local map/workspace change. Tests use disposable synthetic profiles; source collection receipts describe real public-page retrieval separately. No owner browser profile, raw HTML, downloaded assets or third-party content pack is committed.

## Coverage

| Journey / requirements | Evidence |
| --- | --- |
| Match controls, FR001 | Enter/Space keyboard actions, saved mission completion, collapse/reopen and reload |
| Accuracy and relationships, FR002/004 | Read-only scan, exact route/mission/collection targets, stale references and source dependency pins, owned link creation |
| Route planning, FR003 | Deterministic first-anchor heuristic, preview/cancel/apply, reached identity retained, crossing-edge/connector rejection and stale graph refusal |
| Presets, FR005 | Private backup validation, layer/view/layout restore, actual IndexedDB quota failure leaves saved state, viewport and positions unchanged |
| Playback, FR006 | Recorded history only; manual mark promotion once; end-session receipts and explicit receipt removal cancellation |
| References, FR007/008 | URL/path admission, digest verification including private restore, preview/cancel/repeat update, retained changed/missing history, stale completion, spoiler filters and history capacity/deletion refusal |
| Reliability, FR009 | Late reply cancellation, bounded bridge and collector, configured axe/320px panels, held-worker marker tests, regression/build/check/performance gates |

## Executed evidence

- Map unit suite:154 passed,0 failed/skipped, including command domain and read-only bridge tests.
- Python collector suite:5 passed; inert parsing, URL/depth/byte boundaries, subprocess deadline, redirect refusal and failed refresh preservation.
- Guide unit suite:634 passed,0 failed/skipped. Guide build:734 independent routes plus404 page.
- Map build: strict TypeScript and Vite passed; existing chunk-size advisory remains.
- Repository checker:0 failures. Diff whitespace check passed with line-ending normalization advisories only.
- Focused command workflow: seven groups, including quota display rollback and held-worker marker checks. Seven new panels receive configured axe and320px overflow checks. Held-worker test separately passed Chromium/Firefox/WebKit.
- Original035 insertion reproduction passed in Firefox with assertions unchanged after marker/line rendering separation.

Final execution receipts:

- `npm run map:test:browser`:102 groups passed; receipt2026-10-30T20:43:51.927Z, no runtime errors/external requests.
- `npm --prefix tools/hajin-map run test:engines`: Chromium156.0.8078.4, Firefox157.0, WebKit27.2 passed; receipt2026-10-30T20:44:29.874Z, no recorded violations/errors. All include the seven command groups and existing regressions.
- `node --experimental-strip-types scripts/command.browser.cjs` from tools/hajin-map: seven focused groups passed in command-focused-verified.log. Dedicated held-worker runs also passed all three engines.
- `npm run map:test:capacity`: isolated after browser/engine/focused suites completed; production-build receipt2026-10-30T20:46:14.309Z. Source-toggle first-paint p95=183.2ms and search p95=121.7ms against unchanged250ms budgets; comparison-worker maximum274.7ms against2000ms. Fixture5000 owned points/1000 source records/50 reviewed entities/32 icons, four-core affinity/512MiB renderer; no external requests/runtime errors, not a physical8GiB device.
- `npm run map:test`, `npm run map:build`, `py -3 -m unittest discover -s tests -p test_reference_collector.py`, `npm test`, `npm run build`, `py -3 scripts/check.py` and `git diff --check` produced the results above.
- After verification, map5175, guide4173 and Studio4174 each returned HTTP200. The local reference bridge also returned its expected capture.

Independent definition, implementation/security/mobile review and final capacity closure are in checklists/requirements.md. No actionable reviewed blocker remains. Earlier engine failure exposed popup loss on asynchronous line repaint; an earlier full run was cancelled as obsolete after that fix. A test initially tried a hidden launcher; it now uses the visible popup Open route action, preserving the same route-switch assertions. No test fixtures, budgets or required assertions were removed to obtain a pass.

## Actual collection

The web assessment covers27 endpoints across18 domains. Direct collector results cover25 endpoints; Gamers Heroes returned403 and PC Gamer exceeded2MiB. Both remain reference links; no bypass or relaxed limit was used. Sanitized URLs/digests/times/counts are in collection-summary.json. Local validation admitted26 captures across25 source IDs and2,129 candidate occurrences, including retained versions. Candidate digests and strict schemas passed; verified game claims remain false. Some pages yield only headings/links or omit dynamic/unlinked content; specialized extraction and factual review remain necessary for a detailed current catalog.

Raw captures and execution logs are ignored under `.local/reference-captures/`, `.local/nav-repair/command-*` and `tools/hajin-map/.local/browser-checks/`. They are not public assets. The read-only localhost bridge returned HTTP200 for the authorized local CODMunity capture and131 candidates.

## External boundaries

Actual match, road accuracy, physical device and screen reader checks remain not-tested; docs/gameplay-verification.md supplies the owner worksheet. Automated viewports and axe do not replace them. No complete game database, route safety, GPS, optimal routing, meters/ETA or public redistribution is claimed. The source library is a private staging/reference workflow and does not silently rewrite the published native guide. Local commit only; no push, merge or deployment.
