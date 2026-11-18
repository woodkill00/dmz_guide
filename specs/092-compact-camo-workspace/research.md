# Research: compact camo workspace

Observed 18 November 2026. Local architecture audit; no production edits, provider data/art imports, login attempts or new game-fact research.

## Visual reference and evidence boundary

Reference: [WZStats MW4 camo tracker](https://wzstats.gg/mw4/camo-tracker). The parent research agent inspected its public initial view and recorded `.local/camo-reference-092/wzstats-initial.png`: centered charcoal/cyan composition, Challenges/Prestige pill control, four prominent circular completionist medals/counters, and nine collapsible weapon-class cards with four small progress rings. The attempted class interaction was blocked by an Unauthorized response. Consequently the design may use the observed composition, but must not claim knowledge of hidden row behavior, saving, eligibility or detail interactions.

Recreate the useful visual organization with this project's own HTML/CSS, local reference catalog and private completion model. Do not import WZStats data, artwork, accounts, scripts or cloud behavior.

## Decision: one armory save session, two presentations

The existing detailed tracker is `src/client/camo-tracker.mjs`. Its storage lifecycle is currently interleaved with single-weapon DOM selectors. Extract a reusable session that owns the complete loaded armory, captured revision, pending save and failed candidate; both the overview and detailed page use this implementation. The overview adds no schema or private store.

Preserve all existing guarantees:

- Load through `readExistingRecord` without creating an absent database; absence is empty progress, while invalid/unavailable data is unavailable progress, never a reset.
- Validate the whole armory and call `saveArmory(candidate, revision, { requireValidCurrent: true })`. Mutations retain builds, observations, acquisition and archived completion keys.
- Keep a single pending write. Publish saved state only after transaction completion. A failed candidate remains separately exportable and retryable with its original revision; no automatic merging/rebasing.
- Preserve generation/abort guards, refresh-after-pending behavior and focus/visibility/BFCache reload handling. Keep failed work through focus changes rather than reloading it away.
- Retain unsaved-navigation warnings, explicit reload/discard, full-armory failed export and previous-snapshot recovery through existing owner tools.

The session should expose read-only snapshots/status and explicit edit/recovery operations; a view must not mutate its authoritative workspace object. DOM rendering, focus restoration and panel selection remain view responsibilities. Avoid two session instances or duplicate document/window listeners on the same page.

## Existing domain and public catalog

`src/domain/camo-progress.mjs` supplies `progressCatalog`, `parseProgressCatalog`, `camoKey`, `editCamoCompletion` and `camoStates`. Reuse their canonical identities and tracking-order states; do not fork readiness logic for the compact presentation.

`src/ui/weapon-camos.json` is the validated 35-weapon/875-card reference. `scripts/build.mjs` copies the public `src` inventory, so the existing static asset path is `/assets/src/ui/weapon-camos.json`. `src/content/weapon-camos.mjs` already performs build-time bounded validation; browser use must still validate its own received input.

For lazy inline details, the overview can request that same-origin public asset once, with an abort/deadline and a streamed byte cap **before** JSON parsing. Use the existing 2 MiB catalog limit, bounded parsing (depth 8, 40,000 nodes, 2,000-character strings) and catalog validator against the released roster. Match IDs, groups and order to embedded progress metadata before enabling detail edits. Handle truncated, oversized, malformed, mismatched and failed responses explicitly; retry must not create duplicate editors/listeners. Do not fetch provider pages or remote artwork.

A catalog failure must not erase private marks. Keep static weapon links and source context usable, explain that inline detail data is unavailable, and disable writes requiring unvalidated metadata. If storage alone fails, reference browsing can remain usable while private counts show unavailable.

## Projection denominators

The current private model contains **637 unique identities**: 35 × 18 weapon definitions plus seven shared definitions. The 875 displayed source cards include repeated associations, so they are not a count of distinct completion goals.

Use explicit ring/count labels:

| Projection | Denominator / meaning |
|---|---|
| Gold, Platinum, Harmonic Break coverage | 35 weapon-scoped definitions each. |
| Divergence recorded completion | One shared definition, 0/1. |
| Divergence prerequisite progress | 33 Harmonic Break threshold; label separately from 35-weapon coverage and clamp visual percentage if appropriate. |
| Class Gold / Platinum / Harmonic Break | Number of active weapons in that class; these are coverage counts, not readiness thresholds. |
| Class Divergence association | Same one shared definition, not one saved goal per class member. |
| Military / Special / Prestige class groups | Respectively 8n / 3n / 4n weapon-scoped definitions for a class of n weapons. |
| Completionist class group | 3n weapon-scoped definitions plus one shared Divergence if presented as distinct goals. |
| Mode mastery | Six shared definitions total across MP and DMZ. |

Four small class rings must identify their metrics. If they mirror the top completionist medals, use Gold n / Platinum n / Harmonic Break n / Divergence 1. If they instead summarize the four grid tiers, use the group denominators above. Do not silently use repeated display-card counts as distinct-goal totals.

Filters, search terms and collapsed classes affect visibility only. Global badges, class coverage and eligibility thresholds must use the full active roster, and archived unknown marks do not inflate counts. Shared completion changes update every visible association.

Published readiness thresholds remain those already reviewed in the domain: AR Gold 8, SMG Gold 5 and other launch class counts; Harmonic Break and Divergence thresholds 33. Current class coverage is nine ARs and six SMGs. Do not replace source thresholds with current roster sizes.

## Interaction and accessibility

- Use native class disclosure controls or buttons with correct expanded/control relationships. Keep weapon links usable independently of accordion actions.
- Identify detail editors and checkboxes by weapon plus camo key; row-local camo IDs repeat across weapons and cannot be global DOM IDs.
- Delegate clicks/changes through the correct weapon row. A checkbox click must not also collapse its class or reopen a different weapon.
- Preserve checked marks even when earlier tracking steps are unchecked; display completed status before readiness status. Yellow indicates this application's tracking order, not verified in-game eligibility.
- Preserve the two meaningfully different Challenges and Prestige views without hiding required controls from keyboard users. Give rings a textual numerator, denominator and metric; do not rely on color or decorative SVG alone.
- Async focus restoration must check actual visibility and ownership. The old `[hidden]` check does not detect children of closed native `<details>`; do not reopen a collapsed class or steal focus after a user changes panels.
- Keep no-script class summaries and all 35 detailed-page links server-rendered. Existing detailed pages provide no-script requirement lists. Tracking controls remain disabled until safe hydration; unavailable progress uses a dash/message rather than a misleading zero.
- Load swatches lazily only for inspected details from authorized local paths. Missing files retain labelled placeholders and source links.

## Performance and verification

Build one cached catalog index and canonical completion set per accepted snapshot. Derive global/class counts once per repaint, then project only visible rows/open details. Avoid instantiating 875 image-heavy editors at startup or repeatedly rebuilding the catalog during a checkbox change.

Regression coverage should establish: overview/detail parity, one shared Divergence state, fixed denominators under filtering, no-JS links, accessible disclosure/detail controls, bounded failed catalog reads, retained failed candidates, quota failure, cross-tab revision conflict, full-armory preservation, and focus/BFCache/pending-save recovery. Existing detailed-page recovery tests should run against the extracted session rather than being removed because the overview uses different DOM.

No private schema change or WZStats collection is needed. This is a new presentation of the existing local reference and completion state.
