# Acceptance evidence: Page edit and picture actions

Status: implementation and local source-level checks complete; exact-head hosted browser and independent visual/final review are pending. No merge, deployment or browser success is claimed yet.

## Planning and scope

Base main independently checked at 8256f33ca88850668bc9b3ced85383a9e58db0fb on 2026-10-22. Pinned Spec Kit specify, clarify (no blocking questions), plan, checklist, tasks and analyze were executed sequentially with explicit feature selection. Independent reviewer approved safety-usability requirements quality, 8/8. Implementation uses the existing Studio transaction/media boundary and adds six-group contextual actions, exact stable identity, explicit local startup and optional location image references.

## Local verification

- npm run check: repository contracts, 191/191 Node tests and successful build, 154 independent HTML routes plus 404.
- npm run format:check: passed across source, scripts and tests.
- python3 -m unittest discover -s tests -v: 17/17 passed.
- npm run package plus python3 scripts/verify-release.py: 196 public files, clean extraction hashes/native links and Node-only loopback HTTP200 passed. Author helpers/server/Studio modules and local recovery state remain excluded.
- git diff --check: passed.
- npm run test:studio: blocked before browser launch; Chrome distribution is absent at /opt/google/chrome/chrome. No local browser journey or screenshot is counted as passed. No sandbox weakening or local installation was attempted.

## Added acceptance coverage, awaiting hosted execution

Runtime coverage checks all generated detail targets, strict query/identity errors, direct saved-preview actions, location picture references, explicit document navigation versus refused cross-origin APIs/resources/frames/writes, and raw empty/fragment editor targets. Existing save/session/Host/Origin/private-state tests remain passing.

The existing Studio hosted matrix now invokes the new page-edit browser journey. It covers all six groups and two intents, keyboard-focused real public instruction links to a custom-port local author server, no automatic localhost requests, repeated/back navigation, malformed targets, pending-image cancel/reload/switch/save safeguards, shared-primary replacement and unchanged old bytes, additional image and location library reuse, stable identity after rename, and an isolated fresh Git clone/build with exact red/blue/green synthetic pixel assertions. Intended evidence includes dark/light public detail, guidance and selected editor at desktop/390/320 widths with normal and actual 200% text. WebKit keeps functional/computed-layout checks without screenshot injection under strict CSP.

All generated pictures are original synthetic test pixels, not user screenshots or game artwork. Browser tests operate in isolated copied repositories and temporary clones.

## Review repairs before publication

Independent review identified a bare cross-site /? editor-entry gap and prepared-image loss during saving other fields. Both were repaired with strict nonempty target handling, exact raw HTTP regressions and explicit attach-or-cancel-before-save behavior. The return banner is labeled as the opened-from record rather than implying a manual selection still matches it.

Convergence found the first static guidance URL encoding incompatible with normal server URL decoding. T013 applies the existing colon-to-double-hyphen route convention; the regression and native-link release verifier pass after repair.

## Remaining gates

Exact-candidate Chrome Windows/Linux and Firefox/WebKit CI, independent implementation/security review, actual visual inspection, final convergence and parent confirmation before merge. Final PR/head/run links will be recorded when established. Main verification and deployment are not implied by this draft.
