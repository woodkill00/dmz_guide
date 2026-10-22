# Acceptance evidence: Page edit and picture actions

Status: implementation accepted on candidate `8864ef47131a2130d7875943c9cd8a4572ba93ad`: all five hosted jobs green and independent implementation/visual review approved. This documentation-only closeout must receive its own exact-head green run before parent-authorized merge. No merge or deployment is claimed.

## Planning and scope

Base main independently checked at 8256f33ca88850668bc9b3ced85383a9e58db0fb on 2026-10-22. Pinned Spec Kit specify, clarify (no blocking questions), plan, checklist, tasks and analyze were executed sequentially with explicit feature selection. Independent reviewer approved safety-usability requirements quality, 8/8. Implementation uses the existing Studio transaction/media boundary and adds six-group contextual actions, exact stable identity, explicit local startup and optional location image references.

## Local verification

- npm run check: repository contracts, 191/191 Node tests and successful build, 154 independent HTML routes plus 404.
- npm run format:check: passed across source, scripts and tests.
- python3 -m unittest discover -s tests -v: 17/17 passed.
- npm run package plus python3 scripts/verify-release.py: 196 public files, clean extraction hashes/native links and Node-only loopback HTTP200 passed. Author helpers/server/Studio modules and local recovery state remain excluded.
- git diff --check: passed.
- npm run test:studio: blocked before browser launch; Chrome distribution is absent at /opt/google/chrome/chrome. No local browser journey or screenshot is counted as passed. No sandbox weakening or local installation was attempted.

## Executed acceptance coverage

Runtime coverage checks all generated detail targets, strict query/identity errors, direct saved-preview actions, location picture references, explicit document navigation versus refused cross-origin APIs/resources/frames/writes, and raw empty/fragment editor targets. Existing save/session/Host/Origin/private-state tests remain passing.

The existing Studio hosted matrix now invokes the new page-edit browser journey. It covers all six groups and two intents, keyboard-focused real public instruction links to a custom-port local author server, no automatic localhost requests, repeated/back navigation, malformed targets, pending-image cancel/reload/switch/save safeguards, shared-primary replacement and unchanged old bytes, additional image and location library reuse, stable identity after rename, and an isolated fresh Git clone/build with exact red/blue/green synthetic pixel assertions. Passing evidence includes dark/light public detail, guidance and selected editor at desktop/390/320 widths with normal and actual 200% text. WebKit keeps functional/computed-layout checks without screenshot injection under strict CSP.

All generated pictures are original synthetic test pixels, not user screenshots or game artwork. Browser tests operate in isolated copied repositories and temporary clones.

## Review repairs before publication

Independent review identified a bare cross-site /? editor-entry gap and prepared-image loss during saving other fields. Both were repaired with strict nonempty target handling, exact raw HTTP regressions and explicit attach-or-cancel-before-save behavior. The return banner is labeled as the opened-from record rather than implying a manual selection still matches it.

Convergence found the first static guidance URL encoding incompatible with normal server URL decoding. T013 applies the existing colon-to-double-hyphen route convention; the regression and native-link release verifier pass after repair.

## Exact-candidate hosted evidence and independent review

- Draft [PR10](https://github.com/woodkill00/dmz_guide/pull/10), accepted implementation `8864ef47131a2130d7875943c9cd8a4572ba93ad`.
- [Quality run39717287943](https://github.com/woodkill00/dmz_guide/actions/runs/39717287943): all five jobs successful. Repository contracts pass on Windows/Linux. Sandboxed Chrome on Windows/Linux passes existing reader and complete Studio suites, 191 Node regressions, formatting, build and clean release verification. Firefox and WebKit each pass the complete reader and Studio journeys including this feature. WebKit remains functional/computed-layout only under strict CSP, not a screenshot claim.
- Exact-head [Linux Chrome evidence](https://github.com/woodkill00/dmz_guide/actions/runs/39717287943/artifacts/12398854439), [Windows Chrome evidence](https://github.com/woodkill00/dmz_guide/actions/runs/39717287943/artifacts/12399154953), and [Firefox evidence](https://github.com/woodkill00/dmz_guide/actions/runs/39717287943/artifacts/12399498459) were downloaded and SHA256-verified before review.
- Independent reviewer inspected desktop/mobile/enlarged dark/light detail, guidance and editor samples across all three artifacts, including expanded disclosures and the repaired long explanatory text. All108 feature coverage manifests independently validate complete document coverage. Tall pages use bounded tiles without changing viewport, font size, text or layout checks. Source/security and visual approval is recorded in checklists/safety-usability.md.
- Original synthetic image workflow passed upload, primary replacement, additional/reused pictures, location dependency/removal safeguards, exact saved/fresh-clone pixels, unchanged shared record and original image bytes, native cancel retention and identity-preserving rename/return.
- Final local rerun: npm run check (191 Node tests, repository contracts,154 routes), full formatting,17 Python tests and diff hygiene pass. Hosted clean extraction verifies196 file hashes, native links and Node-only loopback HTTP200 on both platforms.

## Convergence and remaining release gate

Convergence rechecked all9 functional requirements,4 success criteria,8 story acceptance scenarios,10 architectural/verification decisions,20 tasks and10 constitution principles. No remaining implementation gap. Earlier harness transport/isolation findings and the real enlarged-paragraph wrapping defect are traced in convergence.md and T013–T020; none was bypassed with blanket health exceptions or disabled security. The one hosted Windows module-load failure was retained as failure (`net::ERR_NO_BUFFER_SPACE`), then normal full acceptance passed on the next exact candidate.

The final evidence-only documentation commit requires exact-head CI revalidation. Parent independently verifies final candidate/run and explicitly confirms before merge. Public deployment and user checkout changes remain outside this feature's completed actions.
