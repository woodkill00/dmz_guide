> Research appendix. Exploratory proposals and alternatives below are superseded where they differ from the canonical spec, plan, ADRs and acceptance gates. Canonical limits: 100 active goals; provisional 20,000 total records and depth 32. The final phased roadmap is S0-S8 in plan.md. Examples are illustrative unless explicitly validated; no application tests have been executed.

# Independent adversarial planning review

Reviewed 21 October 2026. Scope: evolving DMZ Guide planning pack and four research reports, not application code. No remote writes, implementation commands, benchmarks, or runtime tests were performed. Proposed test outcomes below are mathematical examples or acceptance criteria, not passing test results.

## Verdict

**ACCEPT WITH CONDITIONS for the frozen planning candidate reviewed at 10:20 UTC.** The identified internal scope, algorithm-contract and task-order inconsistencies were corrected and independently reread. No unresolved blocking cross-artifact inconsistency was found in the reviewed candidate. This is a consistency review of a proposed plan, not proof of a correct or completed product.

Remaining conditions are explicit future decision/release gates, not hidden plan contradictions: verify screenshot title/build and disputed game facts; clear asset rights; appoint editorial/moderation owners and verified Discord destination; obtain owner approval of implementation scope/environment; validate framework/renderer and mobile import limits in spikes; then implement and run the planned correctness, security, recovery, accessibility and mobile acceptance suites.

This verdict does not approve deployment, real-content publication, asset redistribution, integration credentials, application correctness or accessibility compliance. Those require later evidence.

## Concrete counterexamples and blocking conditions

1. **Shared prerequisite consumption.** Fictional unlock U consumes 2 chips and enables A and B, each consuming 1 chip. Planning A+B with U incomplete needs 4 chips, not 2 (omitted prerequisite) or 6 (duplicated prerequisite). U already completed means 2. Auto-adding U must be an explicit explainable prerequisite-closure policy; otherwise show blocked goals and offer to add U. Unknown costs yield incomplete totals, never zero.
2. **Priority is not executability.** Held X=1, high-priority A needs X+Y, Y missing; low-priority B needs X. Strict reservations protect X for A, even though B could be executed from physical stock. An opportunistic mode may release the reservation only through a deliberate preview. Separate “physically possible” from “allowed under this plan”; never silently consume protected stock.
3. **Batch sharing.** A and B each require one board; a board batch yields two from three wire. Combined demand is one batch/three wire, not two batches/six wire. With one board owned, one batch remains necessary and creates one contingent surplus. Attribution must not charge the entire batch cost to both goals.
4. **Future surplus.** If the now plan's batch requires missing wire, its later surplus board is not owned and cannot make a later goal “craftable now.” Carry dependency/provenance and contingent status through both horizons.
5. **Single-goal cycles already matter.** A→B→A can hang a single-goal planner, not just multi-goal S3. Structural reference checks, selected-graph cycle rejection and bounded traversal belong before S2, even when advanced alternatives/batches arrive later.
6. **Effect versus output.** A stash upgrade that adds 18 capacity is a one-time milestone/effect, not a recipe producing 18 upgrade items. Currency, capacity, inventory, possession requirements and consumed materials need separate typed semantics.
7. **Version conflict is not resolved by recency.** Official printer unlock evidence reportedly conflicts between level 2 and level 1. Preserve exact claim/source, source type, date and applicability; newer marketing alt text does not automatically override older prose. A disputed unlock must not become asserted-ready advice. Allow conditional planning with the unresolved gate visible.
8. **Partial catalog risk.** Missing reverse-use or spawn data means “no tracked/verified use or location,” not “safe to sell” or “does not spawn.” Uncertain ingredient quantities must mark the whole total incomplete, not contribute zero.
9. **Scope contradiction in initial draft.** Feature 001 promised safe JSON round trip, while the generic pack editing/import/export tasks were in S4. Resolve whether 001 includes minimal content-pack import/export or only profile backup; do not claim both without tasks.
10. **Task order contradiction in initial draft.** T037 combined analyze and implement/converge after tests. Preimplementation cross-artifact analysis must precede implementation; convergence/review follow tests. T026 portable picture-format spike originally followed T025 fuzz tests; choose bounded format/limits before implementing and fuzzing its decoder.

## Sixteen constructive proposals with benefits and costs

| Proposal | Benefit | Cost / limitation | Acceptance evidence |
|---|---|---|---|
| 1. Strict reservation default with separate physical feasibility | Predictable priority; no surprising depletion | Can leave lower-priority craft physically possible but disallowed | Counterexample 2, visible reason and deliberate release preview |
| 2. Explicit once-only prerequisite closure | Correct unlock cost totals | More graph semantics and user explanations | U/A/B example; completed/unknown/repeatable prerequisite fixtures |
| 3. One shared ledger and aggregate before rounding | Conserves stock and shares batches | Attribution more complex than independent recipe totals | Batch examples, conservation/property tests |
| 4. Typed milestone effects and resource pools | Prevents capacity-as-yield/cash-as-item bugs | More schemas than one generic quantity field | Capacity, cash, carried/stash, reusable/consumed fixtures |
| 5. Keep conditional supply separate from real inventory | Honest readiness across horizons | Two views of demand/supply | Missing input never creates executable later surplus |
| 6. Claim-level disputes and applicability | Prevents false certainty | Editorial cost; some facts remain unresolved | Conflicting official-source fixture, conditional result |
| 7. Content-only default export and redacted submission preview | Avoids accidental profile/player disclosure | Extra step for full backups | Inspect exported bytes and URLs for private fields |
| 8. Self-contained bounded raster bundle, clearly distinct from reference pack | Delivers real image portability | Decoder/storage/security work | Clean-profile offline import resolves all images; missing-reference errors |
| 9. Fork-and-replace before automatic overlay rebase | Simple author mental model and cheaper v1 | Manual merge after upstream edits | Preserve original and edited versions; explicit diff/conflict recovery |
| 10. Review queue with capacity and ownership gate | Stops unreviewed claims/abuse reaching public content | Moderation bottleneck | Named reviewer/publisher, response policy, rollback exercise |
| 11. Source/asset permission ledger | Avoids treating public visibility as reuse rights | Rights review may delay maps/images | No raw screenshots/private metadata; permission covers distribution/offline use |
| 12. Map/list parity and stable canonical plane | Accessible and resilient location utility | Maintaining two representations | Same details/actions without imagery; transform/corner/floor tests |
| 13. Private-state-free URLs and analytics-free initial build | Reduces disclosure and operational obligations | Less behavioral analytics | Network inspection, share-preview tests; server access logs still acknowledged |
| 14. Static-first stack with measured escalation | Small hosting/maintenance footprint | Islands/shared state require a spike | Name versions, payloads, hydration ownership; no global map/editor dependency |
| 15. Real mobile failure-state matrix | Catches keyboard/sticky/input/zoom failures | More than screenshot-only QA effort | Real iOS+Android smoke, 320px/zoom, quota/offline/error journeys |
| 16. Feature-boundary traceability and phased Spec Kit | Keeps roadmap from becoming one enormous implementation | More small specs and integration checkpoints | Every in-scope requirement maps to task/test; deferred features explicitly marked |

## Privacy, moderation, assets and authoring review

The proposed local-first design materially reduces exposure but is not encryption, durable backup or privacy from scripts on the same origin. Browser storage failures, eviction, cross-tab conflicts and transactional completion must be tested. An imported pack must never fetch an arbitrary remote image/schema/evidence preview merely by parsing it. Disable executable markup; bound raw bytes, expanded archive bytes, file count, pixel dimensions, nesting, graph size and runtime. Content hashes are integrity identifiers, not proof of safe authorship or licenses.

Public correction submission must identify what is sent and where. A GitHub issue is public in this repository: warn before including private inventory, notes, player identifiers or screenshot metadata; provide content-only/redacted template. A static site does not imply a working anonymous moderation endpoint. Discord is an owner-verified link first, not a dependency or identity requirement. Bots, OAuth, hosted uploads and private sync each require a separate scope/threat model and actual operational owner.

Content authors need an achievable lifecycle: edit privately, validate, preview visual and semantic diff, export, review evidence/rights, publish immutable snapshot, retain rollback, then flag dependent claims after changes. Do not require Git proficiency merely to change a recipe locally; advanced raw JSON is optional. A title/version conflict or unknown quantity must be editable without quietly upgrading trust status. Raw supplied screenshots and personal player state must stay out of the repository-ready pack; the inspection report may retain private evidence separately.

## Stack and cost review

Astro plus small React islands is plausible, not proven superior. Record the ownership of shared planner/editor state and hydration boundaries in the spike. A worker is justified by measured main-thread work, not by the presence of a planner. For small DAGs a synchronous pure function is simpler; add worker cancellation and revision checks if a worker is adopted. Do not ship automatic overlay rebasing, ZIP decoding, service workers, accounts and Discord commands together merely because each is individually attractive.

Hosting has no approved vendor or dollar estimate; avoid claiming the site is free. Budget categories include domain, storage/egress for images/maps, build minutes, monitoring and editor/moderator time. Static publishing with curated assets has the lowest initial operational surface, but map delivery can dominate bandwidth. Add measured cost triggers before richer imagery or public uploads. The guide should remain useful if no licensed map art is available, via verified text/list locations and honest empty states.

## Mobile and release evidence

Use representative long ingredient names, unknown values, multi-digit quantities and per-goal explanations, not only short hero content. Input tests must cover transient empty/invalid numbers without resetting user typing, locale formatting, touch keyboard, focus after validation, and sticky controls. Test loading, no data, stale data, unknown gates, failed image, malformed pack, quota failure, cancelled import and interrupted update. A map exception does not justify horizontal page scrolling in recipe reading.

Proposed targets are not test results. Final acceptance should distinguish: automated tests, manual accessibility checks, measured lab performance, real-device smoke and later field metrics. One synthetic browser screenshot cannot certify WCAG or all-phone behavior. The 200-goal benchmark and research's proposed 100-goal cap must be reconciled: use one accepted-input ceiling and explicitly label above-limit stress fixtures.

## Primary-source checks in this independent pass

- IndexedDB 3.0 latest published specification was inspected; it is marked Working Draft (13 August 2025). Its transaction model supports the atomicity approach, but application-level error handling and durable backup remain separate concerns: https://www.w3.org/TR/IndexedDB/ .
- OWASP File Upload Cheat Sheet inspected. Layered file validation and upload/download limits support the proposed approach; a checksum or extension alone is insufficient. Project byte/pixel/archive limits remain product proposals, not OWASP-certified values: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html .
- W3C Reflow page retrieval failed in this independent pass. The peer reports cite it; this review does not claim an independent successful read or measurement: https://www.w3.org/WAI/WCAG22/Understanding/reflow.html .
- Game-specific official-source observations and current Spec Kit command/version verification are attributed to the lead reviewer/delivery researchers, not independently reverified here. No contradictory factual claim was invented to fill gaps.

## Roundtable evidence and reconciliation status

The independent reviewer sent counterexamples 1–7 plus scope/task-order/cap mismatch findings directly to the delivery owner and notified the lead before freeze. This is an actual adversarial exchange, not simulated role-play. Responses and final file verification follow below when available.

### Response verified at 10:17 UTC

The delivery owner explicitly accepted the findings. Independent reread confirmed: feature 001 is now profile-backup-only round trip; T004/T015 provide pre-S2 cycle safety; the per-slice preimplementation gate precedes coding and T037 is postimplementation convergence; T026 format spike precedes T023 parser work; A18–A24 contain the unlock, priority, conditional surplus, source dispute, single-cycle, redaction and cap cases. The plan keeps fork-and-replace, defers workers until measurement and service workers until S8. These remove the initial structural objections.

### Additional property correction from the lead

Do not assert that each horizon's deficits are monotone as stock grows. Fictional now demand one board, later demand one board; a batch yields two boards from three wire. Zero held boards means now wire deficit three and later zero due to contingent batch surplus. One additional held board removes the now batch: now deficit zero but later wire deficit three. Combined demand remains three. Scope any monotonicity property to a fixed combined goal graph/route and policy, never to each now/later bucket separately. The delivery owner was asked to include this exact regression fixture and amend traceability.

Small final wording requests: T004 should reject cycles in the selected recipe graph and mandatory prerequisite graph, not unused alternative routes; analysis should attribute bundle capability to spike plus implementation/testing, not the spike alone. These are precision conditions, not a reversal of the recommended architecture.


### Final freeze-candidate reread, 10:20 UTC

Verified the assembled spec, plan, tasks, acceptance, analysis/traceability, data-model contract, requirements checklist, ADR register, actual roundtable synthesis, page inventory, evidence coverage and future implementation guidance. A25 now contains the cross-horizon counterexample. T004 distinguishes selected recipe-route cycles from unused alternatives and rejects progression-prerequisite cycles. Analysis maps A18–A25 to owning tasks and correctly attributes image portability to T026 plus implementation/tests T023–T025. ADRs preserve requirements-versus-execution, typed effects, strict priority, source disputes, curated publication and lean expansion. No implementation or test execution is claimed.

The earlier ten findings are preserved above as review history and regression specifications; they are not ten outstanding blockers. Final disposition: accept the planning candidate subject to the explicit future gates in the opening verdict. The delivery owner reports that canonical specification/acceptance contracts take precedence over exploratory appendices, including their differing provisional caps. This precedence must remain prominent in the distributed pack. Leaflet remains a proposed initial choice subject to measured renderer review, not a claim of tested suitability.
