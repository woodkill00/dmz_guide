# Evidence, sources and content coverage

> Historical planning snapshot (21 October 2026), preserved as product context. References below to proposed setup, pending licensing or absent repository authorization describe the earlier planning stage, not current repository status. The repository is now being bootstrapped; original project code is MIT licensed. See [current README](../README.md) and [current Spec Kit lifecycle](spec-kit-cycle.md) for active setup and process. Product features and production data remain unimplemented. This snapshot does not authorize external actions.
Research snapshot: 21 October 2026. No complete production dataset has been compiled or verified. “Known” means the category/mechanic is evidenced, not that every record has been enumerated.

## Primary source register
E01 Official Spec Kit repository/release: https://github.com/github/spec-kit/releases — v1.2.2 listed 19 October; pin and reverify before bootstrap. Supports workflow/tooling, not app correctness.
E02 Spec Kit quickstart: https://github.github.io/spec-kit/quickstart.html — current production cycle, active-feature state and gates. Reference details: https://github.github.io/spec-kit/reference/agentic-sdd.html .
E03 Codex integration: https://github.github.io/spec-kit/integrations/codex.html — integration key and dollar-prefixed skill invocation. Setup: https://github.github.io/spec-kit/installation.html .
E04 Official FOB guide, 9 October: https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-dmz-how-to-play-forward-operating-base-guide — confirms MW4 DMZ and discusses stations/crafting; announced DMZ early access 20 October and full launch 23 October. Availability itself not tested.
E05 Official progression article, 19 October: https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-ready-for-launch-progression-prestige — separate DMZ and multiplayer progression. Printer unlock conflict with E04 remains unresolved; do not silently choose a number.
E06 User-provided MW4/DMZ visual references, eight screens — directly inspected by screenshot reviewer; public-redacted observations in `research/screenshot-design.md`; original source provenance retained privately. Supports displayed layouts/requirements only. Build, capture date, live accuracy and redistribution rights unknown. No images, source hashes, private player completion states, balances or holdings are published.
E07 Leaflet non-geographic map documentation: https://leafletjs.com/examples/crs-simple/crs-simple.html — supports coordinate adapter design, not accuracy of any game location.
E08 Browser storage guidance: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria — local storage has quota/eviction behavior; not a backup guarantee.
E09 Discord application commands: https://docs.discord.com/developers/interactions/application-commands — later integration research only; no application/credential action authorized.

Competitive sources and access outcomes are in `research/design-research.md`. They inspire task patterns, not copied content or proof a feature is unique. Some primary sites were blocked; no bypass or claims of visual inspection for blocked pages. MapGenie MWIII Zombies reference does not establish MW4 mechanics or content rights.

## Content completeness matrix
| Area | Known/verified at research level | Missing before production completeness claim | Owner role |
|---|---|---|---|
| MW4/DMZ identity | Official current title/mode sources | Build/patch mapping for every pack | Content lead |
| Items/resources | Categories and selected examples | Enumerated catalog, units, aliases, images, rights, per-record verification | Item editor |
| Crafting/FOB | Official mechanics and observed upgrade examples | All recipes, quantities, pool eligibility, gates, alternate/batch semantics | Crafting editor |
| Progression | Distinct DMZ vs multiplayer tracks | Verified level tables, disputed printer gate, reset behavior, all dependencies | Progress editor |
| Orders/story/campaign | Requested categories and official DMZ station context | Complete spoiler-tagged walkthroughs and campaign/DMZ distinction | Guide editor |
| Maps/locations | Game-world context; reference UI patterns | Licensed/original imagery, calibrated coordinates, floors, all POIs/spawn claims | Map editor |
| Pictures | Visual direction from private references | Redistribution permissions/original assets and asset index | Rights reviewer |
| Discord/community | Product requirement and safe integration options | Server/invite, moderators, rules, review SLA | Community owner |

Use actual counts once compiled: expected-known records, reviewed records, disputed/stale records and missing required fields by game/build/season. Unknown denominator must display “coverage not established,” not 100%. Category readiness is distinct from record correctness. Retired versions remain traceable.

## Editorial operating proposal
Before launch: owner assigns named people to the roles above and confirms capacity. Content lead checks official changes on announced patch/release days; routine weekly review of unresolved/disputed high-impact crafting/progression facts; monthly sample audit of stable guides. These are proposed operating cadences, not scheduled automations or commitments already made. Community reports enter review, never instant publication. Prioritize facts that change spending, inventory reservations or unlock advice. Record who reviewed which claim and why.

A source update triggers affected-entity review through dependency links. Publish changelog and applicability; preserve old state migration. Security-revoked packs differ from merely stale editorial claims. Do not present “complete guide” until scope denominator and source coverage have been demonstrated.
