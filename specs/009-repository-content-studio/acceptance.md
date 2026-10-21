# Acceptance evidence: Repository Content Studio

Status: implementation, exact-head hosted checks and independent final visual/source review passed. Feature PR #8 merged at `b2c2ee9882a89d6ed444650096b759b53c35f079`. Exact-main verification is recorded in the release closeout below.

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

## Hosted iteration 4: Chrome complete; Firefox evidence readiness repair
Run [39665178065](https://github.com/woodkill00/dmz_guide/actions/runs/39665178065), head `a7f0317d6140a31e2bb831c63179c6c50b949f3a`: Windows and Linux Chrome passed the complete Studio journey and strict browser health, and both repository-check jobs passed. Firefox stopped during the initial theme screenshot with `Invalid image request`; its diagnostic had no failed HTTP responses or network failures. The mounted library images receive their src synchronously, but Firefox may defer selecting a lazy image request beyond the scroll operation. The screenshot preparation now waits at most 30 seconds per mounted image for a nonempty currentSrc, completion and positive pixel dimensions, then still requires decode(). This is a test-readiness correction; no application behavior, health assertion or image failure is suppressed. Firefox and WebKit final acceptance remain pending a new hosted run.

## Final release-candidate acceptance

Exact head `ce4d50c35b785db17e1eca96822918fffbe6a3aa`, tree `d7e05d73fbc57c910adcf621a0deea5f60d063f7`, passed all five jobs in [run 39667080542](https://github.com/woodkill00/dmz_guide/actions/runs/39667080542).

- Chrome Windows/Linux and Firefox/WebKit completed the real guided source, weapon/stat, item and recipe journey, crop/thumbnail pixel checks, duplicate/where-used safeguards, portable import/cancel, conflict/draft recovery, saved preview, restart, real fresh Git clone/build, and 1,000-asset bounded lazy paging. Strict network/console health and CSP remained enabled.
- Independent review inspected all 11 final Firefox Studio screenshots at full height and readable scale. All 11 final Windows screenshots were byte-identical to the independently approved preceding Windows set. Coverage includes 320/390/1280 widths, actual 200% text, dark/light, conflict, fresh-clone weapon/gallery/stat and large-library search. Pictures are decoded, not placeholder-only evidence. No blocking clipping, overlap or horizontal spill was found. WebKit checks are functional/computed-layout evidence, not screenshots or physical Safari certification.
- Exact-head local recheck: 186/186 runtime tests, 17/17 Python tests, zero repository-check failures and passing full formatting. Build produces 84 routes plus 404. Package verification checks 126 public file hashes, native links and Node-only loopback HTTP200 after clean extraction. Author-only modules and recovery state are excluded.
- Independent source/security review accepted the scoped implementation and final readiness-only repair. Final scoped convergence covered all 15 functional requirements, 5 measurable outcomes and 3 stories, with no new source gap. T025–T029 cover the preview, themes, text reflow, resource lifecycle and cooperating read/write consistency findings. Existing pending release checks were retained rather than duplicated as new tasks.

## Release closeout

[PR #8](https://github.com/woodkill00/dmz_guide/pull/8) was squash-merged at `b2c2ee9882a89d6ed444650096b759b53c35f079`. Its tree exactly equals the reviewed candidate tree above. The post-merge [run 39668664487](https://github.com/woodkill00/dmz_guide/actions/runs/39668664487) passed all five jobs on that exact merged main commit. T024 is complete.

The bounded closeout updates documentation and task evidence only. Its own final CI result is verifiable through its pull request and main Actions history; recording that result does not require another self-referential evidence commit. No deployment, credentials, automatic Git publishing, exhaustive current game catalog, physical-device testing or formal WCAG certification is claimed.
