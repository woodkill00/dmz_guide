# Acceptance evidence: Repository Content Studio

Status: implementation and local source-level verification complete; hosted browser and independent final acceptance are pending. No completed merge or final visual acceptance is claimed yet.

## Planning gates
- Main baseline verified: `159a922391d773ea598621f45e0683b38f509432`.
- Pinned Spec Kit specify, clarify, plan and tasks executed using installed instructions and prerequisite scripts. No extension hooks are installed.
- Independent requirements-quality checklist: 30/30 initial criteria passed before implementation, with saved-preview addendum CHK031–033 independently approved afterward. Requirements review is not implementation acceptance.
- Initial read-only analyze: 14 functional requirements and 5 measurable criteria covered by 24 tasks, no critical/high inconsistency or unmapped requirement. The approved saved-preview reconciliation adds FR-015 and T025. Concurrency and power-loss limitations are explicit.

## Local evidence, 2026-10-21
- Explicit journaled migration preserved all 3 packs, 81 ordered records, 2 original binary images and provenance. The 94 path changes retired legacy editable whole packs; canonical source is authoritative.
- Migration source revision: `21c366a1432d9eb286a162d6fd89a403005c9bc4a4ea8c48dd2db4f60ee7bc0a`; initial canonical revision: `f879f3438d00edee59f7e818650d4383101f0c38017ce014091f26017fcc8950`.
- `npm test`: 182/182 passed. Includes actual exited-process recovery, stale/external edit guards, bounded/no-symlink schema and journal reads, hostile Host/Origin/session cases, streamed request limit handling, malicious Git helper traps, 1,000-asset canonical catalog, selected-image-only read, portable limit preservation, all relationship types, gallery and saved-preview rendering, and narrowly scoped negative-response health checks.
- `npm run format:check`: passed. `python3 scripts/check.py`: zero failures. Python unit tests: 17/17 passed.
- `npm run package`: 84 routes plus 404; 126 public production files. Author-only modules, server code and transaction state are excluded; shared private-editor guided controls remain included.
- Local cloud browser launch remains blocked by its sandbox environment. No sandbox weakening or successful local browser run is claimed. Hosted Chrome uses installed Chrome with sandbox enabled; Firefox/WebKit functional suites remain configured. WebKit screenshots are intentionally not taken because the screenshot implementation injects CSS incompatible with the preserved CSP.

## Pending verification
- Hosted genuine guided save/restart/fresh-Git-clone/public-build journey, exact crop/thumbnail pixels, portable import/cancel, conflict recovery, saved preview refresh and lazy media behavior.
- Chrome Windows/Linux and Firefox/WebKit behavior; actual desktop/mobile/200% visual inspection.
- Independent implementation/security review, Spec Kit convergence, exact-head CI, authorized merge and exact-main CI.

## Hosted iteration 1
Run [39661200344](https://github.com/woodkill00/dmz_guide/actions/runs/39661200344), head `199d860470d3818406200507f6963266ddad8ab1`: existing browser suites passed on Linux, Windows and the engine job. Studio stopped in the shared where-used scenario because its thumbnail dependency was displayed only as a technical path, not the expected human-readable relationship. The follow-up labels the relationship explicitly while preserving deletion blocking. No final Studio browser pass is claimed from this run.

## Convergence iteration 1
Installed converge protocol ran after implementation, with no hooks. CONV-001 identified the light-only Studio styling as a high-priority contradiction of constitution principle 2, FR-013 and SC-004. Append-only T026 now traces dark-default/optional-light implementation and actual contrast/theme/persistence screenshots. The source fix reuses the existing theme-only module; hosted evidence and final visual acceptance remain pending.

## Hosted iteration 2 and convergence
Run [39662205116](https://github.com/woodkill00/dmz_guide/actions/runs/39662205116), head `842642fc608021eae3673f2fc9fc5eca77e7d5ca`: Studio advanced through guided source/stat/item/recipe creation, image crop/thumbnail/duplicate/usage cases, repository save, saved preview, cancellation and applied portable-import persistence. All browser jobs then found genuine 320px overflow at 200% text (494px document width). Actual screenshot inspection identified long media IDs in unwrapped headings and an unfocused multiline skip-link leak. Append-only convergence task T027 traces the wrapping/skip-link correction. Follow-up tests inspect actual heading text ranges, keyboard-visible skip-link bounds and save offender diagnostics; no text size reduction or content clipping is used. Restart/conflict/fresh-clone/large-library phases remain unverified by this failed run.

## Hosted iteration 3: complete functional journey, failed resource-health gate
Run [39663432501](https://github.com/woodkill00/dmz_guide/actions/runs/39663432501), head `aa6ac439d99779c5d40031c978796f21e03ed1a4`: Chrome on Windows and Linux and Firefox completed the entire Studio journey, including restart/conflict, real fresh Git clone/build and 1,000-asset lazy paging. The corrected 320px/200% layout passed. These jobs still failed the final strict resource-health gate: Chrome reported missing resources including revoked blob URLs, and Firefox/Windows observed an unexpected change-summary HTTP 422. WebKit Studio was not reached. Therefore this is functional execution evidence, not a release pass.

Independent source review confirmed premature media URL revocation and missing explicit author-page favicons. T028 repairs these lifetimes and adds source-stability/cancellation regressions, while health diagnostics now retain source URLs and bounded failure bodies rather than relaxing checks. A prepared-journal test independently reproduced cooperating reads overlapping an active write; T029 serializes those reads with writes, and independent focused server/store tests pass 33/33. The deliberately externally edited conflict fixture now also waits for its startup summary. A new hosted run must establish whether these fixes clear all observed failures. Screenshots will force mounted lazy images to decode before capture so visual evidence shows actual pictures rather than placeholders.

The final cooperative consistency mechanism is a reader/writer barrier, not serial execution of every picture read. A local synthetic 1,000-asset benchmark measured 24 selected-media reads at 14.6 seconds with shared reads versus 29.4 seconds with fully serialized reads. These are local fixture measurements, not a device-independent latency guarantee. Ordering, failure recovery and held-journal tests retain write exclusion.
