# Contributor workflows acceptance
Status: implementation candidate; not release-approved. Exact hosted browser/platform/visual checks and independent final source review remain required.

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
