# Independent Progression spending pixel review

Reviewer: `/root/verify_upgrade_player_journeys/review_spending_fresh_pixels`
Date: 2026-10-26 UTC. Read-only, synthetic-only actual-pixel review.

## Scoped verdict

**PASS for the reviewed rendering, with the long enlarged-text interaction path explicitly retained as a usability limitation.** No blocking clipping, overlapped text, missing control, or misleading merged counter was found in the complete Progression purchase-preview and populated-summary content for Chromium and Firefox. This is not whole-CI acceptance or accessibility certification.

Personally viewed **24 complete component representations**: for each engine, four full-content modal grids, four full-content populated-summary grids, and four original compact-empty screenshots (320/390 CSS px; paired dark/100% and light/200% root text). Also inspected original Firefox 390/light/200 modal tiles 01–02 to distinguish review-grid seam lines from application rendering. Inventory pixels are parent QA's separate lane.

### Readability and meaning actually observed

- Purchase preview opens at the heading/purpose, with a visible heading focus outline, not scrolled straight to the acknowledgment or Cancel button. Both engine manifests independently read `scrollTop: 0`; first modal bounds are x=12/y=12, width=296 or 366, height=820 inside 320/390×844 viewports. The negative-top/initial-bottom problems are not present in these captures.
- Introductory copy says the guide records a reported prior in-game purchase and does not purchase, unlock, synchronize, or verify game eligibility. Availability remains explicitly unknown.
- Each cost clearly separates **saved before / deduct / after**, retained floor, and protected reserve. The visible fictional example is cash 500−100=400, part A 10−3=7, part B 6−2=4, retained tool 1−0=1. Reserve labels remain distinct from spend and resulting stock.
- Counter preview and resulting summary distinguish material count-unit net/gross **5**, reversed **0**, per-item A **3**, B **2**, retained tool **0**, and separate dmz-cash **100**. The currency amount is not visually presented as part of an overall 105-material total.
- Acknowledgment is visibly unchecked; Confirm is visibly disabled/muted in preview; Cancel and the separate status-only correction are fully rendered and labeled at the bottom. No clipped button label was found. Recording versus historical/status-only correction is clear.
- Populated history identifies a recorded purchase, content version and recording timestamp, with a separately labeled `Reverse latest guide entry…` action. Copy explains guide correction, not in-game refund, and retains the latest-unreversed/state-match conditions. These screenshots do not themselves show a reversal confirmation or reversed populated state.
- Compact empty summaries preserve all three zeros, earlier-history/lifetime caveats, count-unit/currency distinction and the net equation. No empty item/history scaffolding or disabled empty paging controls return. Their actual screenshot heights are below 2,532 px in all eight states; this observed image measurement is distinct from parent-owned browser assertion evidence.

### Usability limits, not hidden behind geometry PASS

At 320/200 the modal contains about 11.6k px of meaningful audit detail (~14.2 internal viewports of 816 px); the populated one-purchase/four-identity summary is about 11.4k px. At 390/200 these are ~10.0k and 9.2k px. Labels and content-version/timestamp strings wrap heavily, sometimes within words, but remain present and legible without text overlap. Confirmation/Cancel/status-only controls are at the end rather than sticky. This is a long touch-scroll path, not an empty scaffold or an established inaccessible control; physical-device touch navigation was not exercised in this lane. Do not describe the layout as an optimized mobile interaction merely because bounds and full vertical coverage pass. No new blocking source defect was established by these pixels.

The previously repaired empty-summary footprint is still compact; the populated audit breakdown intentionally contains real rows and history. Existing disabled populated-page pagers remain visually muted and can add height, but do not obscure the distinct active reversal control.

## Evidence identities and carryover

- Published capture source: `d5283565f14b3fc7b4454a02d6d14b6909d47ddf`.
- Embedded source in both spending reports: CI merge `45b135bbf92897a215d7d9ef6828cf1d600f91e0`.
- Independently verified both Git trees equal **`3d7316d11cae17489969f442a0a1d0e28fd121b3`**.
- Independently checked `d528356..16442d9ae8c670d442bb1b858b0651e91ecf7675` path delta: only `specs/023-character-upgrade-planner/acceptance.md`, `tests/browser/studio.mjs`, `tests/browser/upgrades-studio.mjs`, `tests/runtime/upgrades-studio-lifecycle.test.mjs`. No production-source delta. This permits production-rendering attribution, not a claim the newer whole CI passed.
- Local original artifacts: `ubuntu/`, `firefox/`; supplied/ZIP-digest-verified by parent QA. This lane did not redownload or independently rehash the ZIP archives. Firefox artifact ID supplied by parent: 12693545944. Extracted report/capture/image identities are independently hashed in `progression-review-file-sha256.json`.
- Chromium 155.0.8059.39/Linux report: 18 scenario groups, PASS, syntheticStateOnly=true; SHA256 `2d775d5fc6014d174c2730a62094c43f0109abf9ff078df805f898eba68aa87b`.
- Firefox 146.0.1/Linux report: 18 scenario groups, PASS, syntheticStateOnly=true; SHA256 `55f65ea411c76843ba0cbea3b68a784984b1aaf759048e94bee65f86d4ce4d8d`.
- Whole d528356 CI had a Studio timeout. Fresh 40410700580 was still running when this review was requested; terminal CI monitoring and verdict remain parent/builder-owned.

## Capture completeness and dimensions

Parent's retained `ubuntu-audit.json` / `firefox-audit.json` show, per engine and both routes, eight modal plus eight summary manifests, 98 tiles, 82 exact overlaps. I read the artifacts and independently isolated the reviewed Progression subset: **four modal + four summary manifests, 49 tiles, 41 exact overlaps per engine**. All modal initial scroll positions are zero and all four first-frame bounds fit the viewport. This is audit evidence, not a substitute for the actual pixel inspection above.

`../review-spending-grids.py` makes unscaled consecutive strips covering the complete modal/summary content. Its gray headers/background are derived inspection furniture. Original PNGs are untouched. Exact derived grids viewed in this review are copied under `reviewed-progression-grids/{ubuntu,firefox}/` so later parent-owned review-grid seam cleanup cannot change this review snapshot. The initial Firefox 390/light/200 modal review grid included thin horizontal native-frame lines at some stitch boundaries where the first crop edge row included native frame paint; comparing original tiles 01–02 established these were derived crop seams, not production rules drawn across the text. Parent QA then regenerated the inspection grids using a 4 px top-overlap inset (already covered by the prior tile), without changing original captures or coverage. I viewed the regenerated Firefox 390/light/200 and Chromium 320/light/200 modal grids: intermediate frame-row seams are removed and visible content remains intact. The hash manifest includes both the retained initial grids under `reviewed-progression-grids/` and the regenerated parent grids under `{ubuntu,firefox}-review-grids/`. No source defect was attributed to those review-aid seams.

| Engine | State | Modal scroll height | Populated summary height | Empty summary height |
|---|---|---:|---:|---:|
| Chromium | 320-dark-100 | 3572 | 2993 | 528 |
| Chromium | 320-light-200 | 11592 | 11430 | 2176 |
| Chromium | 390-dark-100 | 3303 | 2749 | 482 |
| Chromium | 390-light-200 | 9973 | 9226 | 1701 |
| Firefox | 320-dark-100 | 3576 | 2995 | 529 |
| Firefox | 320-light-200 | 11598 | 11432 | 2176 |
| Firefox | 390-dark-100 | 3306 | 2751 | 482 |
| Firefox | 390-light-200 | 9979 | 9227 | 1701 |

All heights are CSS-pixel capture dimensions; viewport height 844, modal client height 816. Full filenames reviewed are listed/hashes retained in `progression-review-file-sha256.json`. Representative images:
- `reviewed-progression-grids/ubuntu/chromium-purchase-progression-320-light-200-dialog-capture-review-grid.png`
- `reviewed-progression-grids/firefox/firefox-purchase-progression-390-light-200-dialog-capture-review-grid.png`
- `reviewed-progression-grids/ubuntu/chromium-summary-progression-320-dark-100-summary-capture-review-grid.png`
- `reviewed-progression-grids/firefox/firefox-summary-progression-320-light-200-summary-capture-review-grid.png`
- `{ubuntu,firefox}/{chromium,firefox}-empty-summary-progression-320-light-200.png` (corresponding engine/directory pair).

## Limits

No source/CI actions, merge, or deployment. No WebKit screenshot claim (existing capture/CSP policy), Windows full-pixel claim, screen-reader/physical-device/contrast-certification claim, or gameplay/build/prerequisite verification. Root-text enlargement is not universal browser-zoom certification. Conditional quota/CAS/recovery/spoiler-partial/migration/reversal states are covered elsewhere by functional tests, not visually certified by these particular images. All data viewed is fictional synthetic/fresh; no private user holdings.

Signed: `/root/verify_upgrade_player_journeys/review_spending_fresh_pixels`
