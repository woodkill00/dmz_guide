# Contributor workflows acceptance

These entries preserve historical checkpoints. Later dated receipts supersede earlier pending or failed verdicts without erasing their chronology. Final combined closeout is a separate gate.
Historical initial status: implementation candidate; not release-approved. Exact hosted browser/platform/visual checks and independent final source review remain required.

Base: 6d920438245e61c488d5c8d028e9d4a55058983b, then fast-forwarded approved 013 corrections through b54b2312e27a008b75bad04ab7f342ae4ef68ba6 before Studio integration. Independent reviewer approved CHK001–008 before production implementation.

## Reproduction and local verification (2026-10-22)

- New contract suite first ran against base: four tests failed for absent recovery parser, absent stable navigation/version/recovery controls, and absent role diagnostics. No tests removed to make it pass.
- Independent review found repository-source fallback accepted rights-only asset metadata drift. Added regression first: failed with Missing expected rejection. Canonical full metadata comparison repaired it; reordered object keys remain semantically equivalent.
- Six focused tests now pass: valid/versioned identity-bound recovery, malformed/duplicate/oversize/abort rejection, actual raster signature/hash/dimension/rights/source checks, Studio markup, read-only role diagnostics, and real missing-build/occupied-port process exits.
- Security fixture update: existing author-server test used a missing reader build; provide an isolated synthetic reader index and preserve exact POST405 assertion and bounded startup. Fourteen combined author-server/contributor tests pass.
- Release verifier fixture update: synthetic archive contained only /maps/; add synthetic root index to meet the real startup contract. Exact maps bytes and failure/watchdog assertions unchanged. All25 Python tests pass.
- npm run check passes: 280 tests, 279 pass, zero failures, one pre-existing Windows-only test skipped on Linux; build produces154 independent HTML routes plus404.
- npm run format:check passes. git diff --check passes.
- npm ci initially failed because default home cache was unavailable; rerun using writable /tmp cache succeeded with pinned dependencies and no package changes.

## Browser evidence not yet available locally

Focused Google Chrome launch fails because /opt/google/chrome/chrome is absent. Firefox/WebKit invocation fails at missing browser installation. A diagnostic launch of installed /usr/bin/chromium with sandbox enabled also fails with socket Operation not permitted. No sandbox/security bypass used. These are NOT PASS and no screenshots are claimed.

New tests/browser/contributor-workflows.mjs includes keyboard anchors with exact DOM/value retention, version preview invalidation, inert recovery preview/cancel/apply, actual synthetic PNG with explicit rights gate, malformed media rejection preserving draft, deterministic delayed decoder cancel/catalog-switch invalidation, strict shared health monitoring, widths320/390/1280 dark/light and measured actual200% text with full-page/tiled capture helper.

Run both `node tests/browser/contributor-workflows.mjs` and `node tests/browser/contributor-workflows.mjs --engines` in the existing actual Windows/Linux Chrome/Firefox/WebKit environment. Retain all existing browser suites unchanged. Exact-head CI and independent source/visual review precede merge; exact-main CI follows integrator merge. Repository save is not publication.

Independent reviewer inspected expanded acceptance source and independently reran6 focused tests; preliminary source approval granted for bounded candidate, not runtime/visual release approval. Exact author-only parser exclusion added to build and release boundaries after red-first Python boundary assertion; all game-slug exceptions retained.

Startup baseline replay (after implementation, not represented as red-first): isolated b54b231 serve.mjs with no dist remained running and printed a success URL; new startup test requires bounded actionable exit. Earlier source inspection identified the behavior; the replay confirms it. Final local rerun after exact exclusions: npm check280 tests/279 pass/1 platform skip/0 fail, Python25/25, formatting and diff whitespace pass; static dist contains no recovery parser.

Integration checkpoint: stacked onto014. Removed inert016 description controls from this candidate;016 will introduce them with working behavior. New browser evidence uses exact same-origin test-only CSS under unchanged Studio CSP, captures normal and actual200% recovery preview in both themes, and retains functional/reflow tests without WebKit screenshot claims. Independent retrospective baseline replay confirms missing-build behavior, but does not change the disclosed chronology deviation; parent merge decision must see it.

## Hosted visual follow-up, 2026-10-22

Published bc2f2c74309d227ca1bfb720a899b6455b046c56, PR16 run39768305948: new standalone Chrome contributor journey passed on Linux and Windows, but this does not establish overall run success (inherited014 suite failure remains separately owned). Firefox standalone job119789186595 failed actual200% horizontal reflow before failure geometry capture. Validator added diagnostic-only capture; await exact offending measurements before repair.

Independent inspection of Linux Chrome320dark200 full-page/tiled artifact12421476208 found a separate real issue: imported-picture rights checkbox collapsed to a near-invisible speck. CSS input[type=checkbox] has1.2em dimensions but default flex shrink under a long confirmation label. Bounded candidate adds flex-shrink:0, retaining native control dimensions, font sizes, label/touch target and all content. Actual reflow/checkbox geometry and visual rerun remain required; no pass claimed from source change.

### Measured Firefox summary overflow

The subsequent015 c231 artifact12421028938 establishes document/body337px at viewport320px and actual root/body32px text. All element border boxes fit; painted text in the import-manifest summary token `contentVersion` extends past the right edge. Independent crop from tile003 confirms this exact source. Rights checkbox now measures38.4px square, so the preceding repair is effective in this failing case, not a claim of full-matrix acceptance.

The bounded next fix adds `overflow-wrap:anywhere` to summary text. It retains native disclosure markers, original font and44px minimum height, and all content; no clipping or horizontal-overflow assertion changes. Formatting/diff checks pass; actual hosted Firefox/full-matrix reflow and visual acceptance remain pending.

## Later candidate acceptance and failed inherited main fixture, 2026-10-22

The integration ledger records independently accepted `86c2572b92b2fb5a32c94d8fd1b5cb87303fb95d` and [run 39784262513](https://github.com/woodkill00/dmz_guide/actions/runs/39784262513), merged through PR 16 as main `c50e8cf017e0cd55ad202ca46eceab750977592a`. Actual main [run 39788052635](https://github.com/woodkill00/dmz_guide/actions/runs/39788052635) exposed two Windows readiness-fixture bootstrap failures; that failed original run is not relabelled green. The reviewed 013 maintenance was normally merged through PR 19 as `db8951d871eeb841735166eb37316e9650305aa4`; all six required jobs in repaired exact-main [run 39809260497](https://github.com/woodkill00/dmz_guide/actions/runs/39809260497) completed successfully, independently verified at 16:07 UTC.

Candidate acceptance includes stable-DOM keyboard navigation preserving incomplete raw input/rights/preview state, explicit version re-review, bounded inert version 1 recovery, actual raster/rights refusal, hash rejection and held-decode cancellation/catalog-switch retention. 36 contributor coverage records and representative native-pixel review support normal/actual 200% layouts, including corrected native checkbox sizing and summary reflow; WebKit is functional/strict-health evidence without screenshots. The startup chronology exception remains explicit: implementation preceded the unchanged-baseline replay. The missing-build replay did not establish occupied-port failure-first ordering. The integration reviewer accepted that disclosed deviation; this addition does not retroactively claim red-first startup work. Repaired exact-main verification is complete; the separate final closeout remains pending.

The bounded startup process exception and its expiry/revisit trigger are recorded in [ADR 14](../../docs/adr/0014-startup-verification-chronology.md). The earlier exact-source occupied-port verifier harness establishes valid baseline refusal, not a separate 015 friendly-diagnostic red-first sequence. No production behavior or future testing requirement is changed by this record.

## Recovery category boundary repair assessment, 2026-10-22

T021 follows the existing FR-006 malformed-value rejection contract, without adding categories or changing recovery format/version. A controlled real-parser reproduction on `e3dd855b6e8c948612fb430058966f0a8429969e` used an otherwise-valid catalog and an original synthetic 1x1 PNG with checked CRCs and an inflated real RGBA scanline. The string `"other"` and malformed arrays `["other"]`, `[["other"]]`, and `["items"]` were accepted; ordinary object/null/number values were rejected. The existing three recovery-focused tests passed despite this coverage gap.

The impact is bounded: `parseRecoveryDraft` maps uploads to payloads containing only `assetId`/`base64`, and Studio creates new normalized uploads with category `"other"`. The original malformed category does not survive into the preview upload map. No arbitrary path construction, current-draft mutation during parsing, or bypass of explicit rights/apply/save gates was demonstrated. Full actual category-shape regression and red-before-fix verification follow; this assessment alone is not a repaired or release-approved verdict.

### T021 red, repair and local verification

- With `SPECIFY_FEATURE_DIRECTORY` explicitly set to `specs/015-contributor-workflows`, the new `tests/runtime/recovery-category-shape.test.mjs` ran before the parser source changed: **93 tests, 76 passed, 17 failed**. All 16 singleton/nested arrays containing an allowed category were incorrectly accepted. The seventeenth failure was an object with an own non-callable `toString` value: it rejected with a coercion `TypeError` instead of the bounded category error. Eight exact allowed strings passed; whitespace/newline rejection controls already passed. This is actual red-before-repair execution, not a retrospective ordering claim.
- The production repair adds only `typeof upload.category === "string"` before the unchanged category enum regex. Accepted category names, the named version-1 envelope, error text, image validation, payload stripping, downstream normalization, and rights/apply/save boundaries are unchanged. No migration or new dependencies are required.
- The complete 93-case real-parser matrix covers all eight allowed category strings, null/boolean/number/object values, empty/single/nested/multiple/mixed arrays, and empty/case/unknown/path/space/tab/newline/carriage-return/Unicode-line-separator strings. After repair, the eight exact strings are accepted and all 85 malformed values reject with the bounded category error before decoder invocation. Input/current-pack preservation and the absence of original upload/category fields in returned payloads are asserted. The positive fixture inflates actual original synthetic PNG pixel bytes.
- `node --test tests/runtime/recovery-category-shape.test.mjs tests/runtime/contributor-workflows.test.mjs`: **99/99 passed**, no skips. The independent reviewer separately inspected the exact source/test change and reran **93/93** focused tests before commit, approving this bounded repair. Reviewed parser SHA-256: `6a1fefffeddd9a9398615707f427adc1aed285a2d229b4893df9325eb32381eb`; regression file SHA-256: `a4c16a61beffcdeff4d23994f853c69d0ce2122f9613aa822ecf63549f943333`.
- `npm run check`: repository checks **0 failures**, **442 runtime tests, 441 passed, 0 failed, 1 existing Windows-only skip on Linux**; build produced **154 independent HTML routes plus 404**.
- `python3 -m unittest discover -s tests -v`: **40/40 passed**. `npm run format:check` and `git diff --check` passed. Local runtime was Node **v24.19.0** on Linux.
- Bounded convergence found no remaining category type/enum gap against FR-006/US1-AC2, nor a category-related mutation or payload-propagation regression. T021 is locally complete. The pre-existing T013 all-feature convergence remains open; later integrated exact-head Windows/Linux browser/strict-health/visual verification and exact-main checks remain the integrator's responsibility. No browser run, remote publication or merge was performed for this local repair.
