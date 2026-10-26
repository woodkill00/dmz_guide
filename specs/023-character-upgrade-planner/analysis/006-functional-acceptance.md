# Independent implementation acceptance — functional, recovery and visual QA

Reviewer: `/root/verify_upgrade_player_journeys` (separate from integration writer)
Date: 2026-10-26 UTC
Verdict: **PASS for the reviewed implementation, with the explicit limits and unresolved historical Windows timeout below.**

Final reconciliation: 2026-10-26 16:37 UTC. All current quality jobs are successful; the Windows success is the single authorized same-head diagnostic repeat, not a first-attempt clean pass.

## Source and execution identity

- Reviewed publication: `a5212fc496e234d32e6e9a1097f24852d210c25a`, tree `1c8aa1ca96a70bcfd8d53ce9af9473616978c3dd`.
- Hosted quality run: `40356453421`; artifact report source: PR merge `5f8b4031522847ba8e3c0458b33e568bf875c7a3` (fetched locally and independently confirmed to have the same tree as the publication).
- Production source is unchanged from the independently reviewed causal-focus checkpoint, published `4a23e2694fa690303b539873601baf2f8069defa`, tree `6d2888795cfe3da200531612359a92bfca866358`. The later delta restores the pre-existing WebKit screenshot/CSP policy and makes evidence wording truthful; no functional assertion was removed.
- Reviewer-authored browser modules: journey SHA-256 `a5a3789419606a0c357d94082f2cc1a00796927710df19149b8ae1fe8ee4c0a3`; advice SHA-256 `231dd1bb97e8988af300cf166a15390a733449b1a38aaa33b079dbc8ecdd8452`.
- Local browser execution was blocked before page startup by sandbox socket restrictions. No disabled-sandbox workaround was used. Actual browser claims below come from authorized hosted CI, not VM simulation.

## Independently inspected hosted results

| Platform/engine                                | Actual journey + advice          | Actual Studio v1/v2 and strict health | 50-run browser p95 |
| ---------------------------------------------- | -------------------------------- | ------------------------------------- | -----------------: |
| Ubuntu, Chromium 155.0.8059.39 / Node 22.23.3  | PASS                             | PASS                                  |             16.1ms |
| Windows, Chromium 156.0.8078.48 / Node 22.23.4 | PASS on authorized repeat        | PASS                                  |             29.2ms |
| Ubuntu, Firefox 146.0.1 / Node 22.23.3         | PASS                             | PASS                                  |               57ms |
| Ubuntu, WebKit 26.0 / Node 22.23.3             | PASS, functional/computed-layout | PASS                                  |               32ms |

The independently fetched current job list confirms the full Ubuntu/Windows runtime, Firefox/WebKit, repository-check and Node 24 compatibility jobs successful, including native/engine Studio and packaging where configured. This is not a claim that the first Windows attempt passed.

Browser timings use five warmups and 50 measured runs, four reported logical CPUs, 5,766 validated roots in one shared accounting scope. Each platform's browser report also records 121 distinct materials in 50/50/21 keyboard pages, no focus goals inserted, and at most 50 rendered rows. Measurements are reference-run evidence, not a universal device guarantee.

Actual Studio evidence covers both schema versions: guided edit → advanced JSON edit → preview/save → server restart → export → file import, with exact no-field-loss assertions. Strict browser/Studio health remains enabled; CSP was not relaxed.

## Functional and recovery coverage

The independently authored modules executed these groups rather than merely appearing in the harness:

- Exact observed eight upgrades, 31 cost rows and 22 labels; fresh empty holdings, unknown completion/availability/mechanics and visibly rendered requirements.
- Absent stock versus explicit zero versus clear; reserve preservation; dirty navigation Cancel, explicit save/reload; unsaved inventory cannot hitchhike on a progress-only save.
- Availability and completion independently on inventory/progression; Cancel, repeated activation, reload and Undo; stock/reserves/goals/pins unchanged by progress; keyboard focus restored after the native-modal repair.
- Two-tab CAS, injected quota failures, unchanged durable/previous snapshots, distinct failed inventory/progress/watch-pin candidate exports, explicit discard, and no automatic newer-revision retry. Both watch-pin surfaces and both progress surfaces are exercised.
- Explicit v1 migration preview/cancel/commit, ambiguous legacy-state preservation, exact original-snapshot recovery without silent remigration, real v2 backup/file restore and cross-pack rejection. The registered rebind journey covers changed cost/objective source/requirement source, retired/new IDs, CAS, recovery and v1/v2 restoration.
- Separate fictional accounting fixture: shared demand 15 / stock 6 / Search 9, focused 5/5/0 without modifying goals, fully stocked positive Keep with zero Search, reserve/upgrade gaps (H6/R9/G15 → Search18), collecting to H24 clears both gaps, completion removes demand without consuming/refunding stock, and no-known-need remains distinct from user reserve/pin rules.
- Actual observed mechanics remain numeric-gated even after entering synthetic stock; manual input does not verify gameplay consumption. Spoiler fixtures exercise hidden terms embedded in otherwise visible item names and locations whose parent map is hidden. Selected-pack references remain scoped correctly.

Separate domain/source review owns comprehensive A01–A20 and alias/cross-pack accounting validation; this QA report does not relabel those runtime/property probes as browser interactions.

## Actual pixels and accessibility boundaries

Chromium/Firefox captures cover inventory, progression and planner at 320/390 CSS pixels, dark 100% and light 200% text, with computed-layout checks additionally exercising both themes at both text sizes. Root text is actually 16px/32px, reduced motion is enabled, and control/document bounds are asserted. Keyboard navigation, paging, confirmations and focus return are exercised.

I manually inspected representative top/middle/bottom sections for all 12 Windows and Firefox responsive captures, plus Ubuntu enlarged-text sections, synthetic advice/item-detail/completed-user-rule states, rebind preview and visible paging focus. Final-production screenshots were independently compared to those inspected pixels; all 239 PNGs across Ubuntu/Windows/Firefox were pixel-identical. Current a5212fc artifacts independently preserve that continuity: Ubuntu 82/82, Windows 75/75 and Firefox 82/82 PNGs are pixel-identical to the reviewed 4a23e26 captures. New final-production and current-head representative pixels were also opened directly. This is sampled visual review, not a claim to have manually inspected every pixel.

Capture audit: Ubuntu 12 manifests/77 tiles/65 overlaps, Windows 12/70/58, Firefox 12/77/65. Actual PNG dimensions match every manifest; tiles cover full document height with 256px overlap and unchanged viewport/text metadata. Chromium overlaps are all pixel-identical. Firefox 33/65 overlaps are exact; the remaining 32 differ only by 2–20 border/corner pixels, independently inspected with no content loss. WebKit screenshots are **not** an acceptance claim: the pre-existing pinned-tool/CSP policy requires functional/computed-layout evidence only.

No blocking clipping, overlap, missing actionable content or false exact real-game advice was observed in inspected pixels. Nonblocking polish remains: adjacent watch/item buttons share an edge; at 320px/200% the native input placeholder truncates, but adjacent full not-entered copy preserves meaning. Enlarged narrow cards wrap aggressively; page length alone is not treated as failure.

No physical-device/iOS Safari certification, manual screen-reader certification or WCAG conformance claim is made. Real gameplay consumption, exhaustive prerequisites, capture date and current-build applicability remain unresolved evidence gates.

## Independently verified artifact provenance

Current run 40356453421, downloaded ZIP SHA-256 checked against GitHub metadata:

| Artifact                           |          ID | SHA-256                                                            |
| ---------------------------------- | ----------: | ------------------------------------------------------------------ |
| Ubuntu compact                     | 12665818344 | `fc72856a5e12d11ac575775fd416fa28e35ebc4bafa158f1e27dc4f417c784b6` |
| Firefox compact                    | 12665633997 | `ab4d654e72efd5158044980c6420e49c7c3d26e70b73c8d16f0ef447dd35877f` |
| WebKit functional                  | 12666441943 | `8685c712c971d180108b7670675def066877c18d36cf1b58c69a5665c62851e0` |
| Windows compact, authorized repeat | 12668420959 | `b47ff29631deb82c90c040bef53f1553f8833dc96bd7f969fe3b3695e5781bd2` |

Windows visual continuity references same-production run 40354543516, artifact 12664574796 (`63592f4544e52327dbb0632a77b2b9ff98e505bdd581c34bb6115a8c21ccfd3b`). The final same-head repeat artifact above was downloaded, digest-checked, manifest-audited and pixel-compared independently.

All evidence uses fresh or isolated fictional QA state. No actual owner holdings, raw private observation screenshots or credentials were published in these artifacts.

## Discovery and failure reconciliation

Independently inspected retained discovery logs: native+engine sentinel log SHA-256 `70d4c0b538be7ceb25d5d726978813ccbae1e7769db33a2d032a8f81d3a93815`; runtime sentinel log `cd0dcc866afe414a76012ce753d989f8cfeb50ea0f2b86dfd5bfce6f37d93d84`. Browser logs show the deliberate named throw from `upgrades.mjs`; runtime log records exactly one named intentional failure. Exit 1 is retained in the integrator's execution record, not embedded in these text logs. Native/engine imports and absence of remaining sentinels were independently checked. Actual hosted report files establish later execution of the reviewer modules.

Earlier failures remain historical failures: obsolete blank-invalid fixtures, Firefox full-image size limit, Studio helper premature shutdown, pre-test APT timeout, persistent WebKit focus loss, and screenshot-induced WebKit CSP errors. Repairs preserved intended assertions and strict health. The focus repair was driven by actual event/node-identity traces; diagnostic wrappers/probes were removed before acceptance. Twelve causal lifecycle regressions were independently rerun and passed.

Current Windows first attempt timed out in unchanged pre-feature inventory pagination dark→light keyboard theme activation, after all dark normal/200% cases. Artifact 12666725686 preserved the phase, but no event/health snapshot established cause. The single parent-authorized same-head diagnostic repeat passed the full native browser, Studio, health and packaging job, but the original timeout remains unexplained; the repeat establishes a successful run, not its root cause. No blanket retry or assertion relaxation is represented as a fix.

No merge, deploy, public gameplay-readiness or admission of additional private observations is approved by this review.

Reviewer attribution: `/root/verify_upgrade_player_journeys`. This report is independent of the integration writer and may be copied verbatim into implementation acceptance records.
