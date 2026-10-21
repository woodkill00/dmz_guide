# Acceptance and release evidence plan
All cases are PLANNED / NOT RUN. No test result is implied by this document.

## Behavior and correctness
A01 (FR01): first visit dark; explicit light persists; no unreadable flash, clipped content or hidden focus at 320/375/390/768/1280 widths and 200% text zoom.
A02 (FR02/03): exact item query leads to matching detail; back preserves query/filter/scroll; source/version/status present; unknown data never displays fabricated zero or verified badge.
A03 (FR04/06): currency, consumed item, reusable tool, prerequisite and effect are distinguishable; unsupported mechanics produce a useful error rather than a plausible wrong answer.
A04 (FR05): inventory changes survive reload; storage denial/quota/eviction and interrupted migration explain recovery and never claim a successful save. Cross-tab revision conflict prompts reconcile/retry, not last-write data loss.
A05 (FR06): two goals each need one board; selected recipe yields two boards from three wire. Aggregate production consumes three wire, not six. Existing one board still requires one batch with one surplus. No intermediate or source unit may be allocated twice.
A06 (FR06/07): five wire held, current goal needs three, future goal needs four: current allocation three, future allocation two, future shortage two. With protected reserve two, held four and requirement three: usable two and shortage one.
A07 (FR07): unknown unlock yields unknown-gate label; locked-but-collectable material may be reserved only under explicit policy. Changing priority updates ledger deterministically and explains what changed.
A08 (FR06): selected cycle rejected; alternate recipes require explicit pin; unsupported co-products not silently flattened; batch overflow, negative, fractional-in-integer-unit and nonfinite quantities rejected.
A09 (FR08/09): local edit -> preview -> export -> clean-profile import preserves semantic records, image assets and rights metadata. Reference-only exports explicitly flag missing assets and cannot satisfy self-contained picture-pack acceptance.
A10 (FR09/14): malformed/oversized pack, duplicate IDs, unknown schema, mismatched namespace and conflicting revision cause no mutation; unresolved historical IDs preserved for recovery; restore original after failure.
A11 (FR10): list and map have identical filter/selected-location state; list supplies floor/grid/landmark directions and same actions. Three non-collinear calibration points and bounds test x/y swap, y inversion, image replacement and coordinate-version migration.
A12 (FR10): possible/random spawns labeled; itinerary lines never imply navigable shortest route. Missing imagery, failed tiles and offline mode retain essential list content.
A13 (FR11): mark visited does not mean collected/completed; complete does not automatically deduct stock; explicit manual craft simulation shows consequences with undo and does not claim to change the game.
A14 (FR11): campaign/story/DMZ/MP progress scoped separately; spoiler preference filters text in search/list/route titles and previews, not just article body.
A15 (FR12/13): verified Discord link works; app remains useful without it; corrections remain unpublished until reviewed; reputation is not verification.
A16 (FR14): ordinary outdated content remains readable with warning; known unsafe packs cannot execute/import; reconnect rechecks any configured revocation feed; offline UI states when trust was last checked and preserves local progress.
A17 (FR15): loading/empty/no-results/error/offline/stale/storage-failure states have specific recovery actions and no dead-end skeletons.

## Import and asset attack suite
Reject prototype-pollution keys, executable HTML/Markdown, javascript/data executable URLs, external automatic fetches, path traversal including encoded/Windows paths, absolute paths, symlink entries, duplicate/case-colliding archive entries, excessive nesting, JSON/XML polyglots, archive expansion bombs and image decoded-pixel bombs. Use MIME signature checks, raster decode/re-encode, per-file+total+entity budgets and fail-closed transactions. SVG/HTML disallowed in the initial image pipeline. Hash confirms integrity, not authorship or safety. Test parser/worker termination and cancellation. Import never transmits private files to a server by default.

Provisional limits for spike, not final production promises: manifest 5 MiB; 20,000 records; nesting depth 32; strings 20,000 chars unless field-specific lower cap; selected raster <=5 MiB and <=16 megapixels; bundle <=25 MiB compressed /100 MiB decoded asset bytes /200 entries; total decoded-pixel budget enforced separately. Determine practical mobile memory ceiling and reduce if needed. Distinguish compressed-byte, expanded-byte and pixel limits.

## Accessibility/manual review
Automated axe-style checks plus real keyboard and screen-reader task passes. Verify names/roles/state, focus after navigation/dialog/import errors, live-region quantity updates without chatter, heading order, color contrast, reduced motion, touch targets, zoom, orientation, safe-area and virtual-keyboard overlap. Contrast tested in dark and light; rarity and “needed” never color-only. Map drag has alternatives and modal sheets trap/restore focus appropriately.

## Performance and visual evidence
Use documented browser/device/network/CPU profile, dataset version, cold/warm cache and three-or-more runs. Record bundle reports, LCP/CLS, memory and planner/search timings; INP field claims only with real-user observations. Screenshot matrix includes 320x568, 390x844, 768x1024, 1280x800 plus landscape, 200% text, reduced motion, all key error states, long names and large quantities. Baselines require human approval and cannot auto-update to hide regressions.

## Completion evidence record
For every A-ID record build commit, content-pack hash, device/browser/profile, test name, result, evidence path, reviewer and date. Release requires no unresolved critical/high security or data-loss defects; no unsupported factual claims; all in-scope requirements covered; independent visual/mobile review; rollback and restore rehearsal. Lower-severity deferrals need owner, rationale and a visible limitation. Spec Kit converge adds confidence but does not replace this evidence.

## Adversarial additions
A18: Shared unlock U costs two chips and enables A/B, each costing one: A+B requires four, not two or six; if U completed, two.
A19: Held X=1; high-priority A needs X and missing Y; lower B needs X. Strict reservation cannot mark B executable by silently spending A's X. Work-conserving mode must be explicitly selected and disclose delay to A.
A20: A future batch's surplus remains projected until a deliberate local inventory transaction records completion; never mix projected and owned stock.
A21: Two official sources disagree on printer unlock: retain both claim records and applicability; show disputed gate and conditional plan, never silently choose newest or certify ready.
A22: A single-goal dependency cycle is rejected before recursive expansion, not only in multi-goal mode.
A23: A correction export preview excludes private inventory/profile fields, player identifiers and raw screenshots; public issue instructions warn against attaching them.
A24: The 101st active goal receives a recoverable cap message; 200-goal load is an over-limit stress test, not accepted production size.

A25: Now needs one board; later needs one; one batch yields two boards for three wire. With no boards, now's wire shortage is three and later zero due to contingent surplus. With one held board, now shortage is zero and later three. Per-horizon shortages are not stock-monotone. Test conservation and fixed combined-goal totals; any monotonicity property must state supported graph/alternative assumptions and cannot incorrectly constrain each horizon.
