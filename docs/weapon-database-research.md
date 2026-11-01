# Weapon and attachment database research

Researched 2026-11-01 for MW4 DMZ. This is a source assessment and implementation brief, not a shipped catalog expansion or a claim of complete current-build statistics. Existing previews and gameplay data are unchanged.

## What we have locally

The official-starter pack has four weapon records: Axion, Han 86, Kastov 762 and M4. Axion, Han 86 and Kastov 762 have empty stats arrays; M4 has one explicit unknown fire-rate observation with a null value. None has a populated numeric performance value. Their shared source explicitly supports identity/class rather than live DMZ performance. The demo rifle is fictional and must remain separate. The JSON content packs are the current database; a SQL server is not needed for this expansion.

The schema already supports numeric stats, units, target/range/attachment/stance/method context, per-stat source IDs, review dates and game/mode/build scope. It does not yet model reusable attachment identities, explicit compatibility, blocked slots or signed attachment effects. The current numeric stat value is nonnegative: a negative modifier cannot safely be forced into that field. These are future shared-contract changes requiring schema, validation, editor, import/export and reader review.

## Sources inspected and their roles

| Source | Useful coverage | Limits and decision |
| --- | --- | --- |
| [Official launch overview](https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-launch-multiplayer-operators-weapons-equipment-create-a-class) | Publisher baseline: 33 launch weapons; fire rate, magazine/reserve, levels, unlock criteria, slot types and Apex descriptions/restrictions | Launch baseline rather than proof of current DMZ combat performance. Keep MP unlock criteria distinct from DMZ acquisition. |
| [Official FOB guide](https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-dmz-how-to-play-forward-operating-base-guide) | DMZ Gunsmith, shared progression and acquisition context | Systems explanation, not a complete attachment-stat catalog. |
| [Official rolling patch notes](https://www.callofduty.com/patchnotes/2026/10/call-of-duty-modern-warfare-4-launch-patch-notes) | Dated changes and mode sections, including weapon/attachment adjustments | October 28 weapon tuning is under Multiplayer. Do not apply it automatically to DMZ. Range entries can lack explicit physical units; retain raw units as unspecified until established. A delta is not a full new base profile. |
| [Official guide directory](https://www.callofduty.com/guides/modernwarfare4) | Future discovery point | Dedicated weapons guide currently says coming soon. Do not build an importer around a nonexistent guide. |
| [CODMunity DMZ](https://codmunity.gg/mw4-dmz) and [Han 86](https://codmunity.gg/weapon/mw4/han-86) | Mode-labelled recommended builds, weapon-to-attachment tables, unlock reports and effect values | The same weapon page labels its attachment stats as Warzone. Preserve section-level applicability; DMZ recommendations do not establish DMZ numeric values. |
| [CODMunity MW4 comparator](https://codmunity.gg/weapon-stats/mw4) | Damage/TTK profiles, handling and ballistic measurements, attachment comparison interface | Explicitly identifies Multiplayer. Static text can contain an attachment-data loading warning: never capture the displayed base numbers as an applied build. |
| [CODMunity attachment example](https://codmunity.gg/attachment/mw4/5-56-nato-high-velocity) | Shared attachment identity and effect presentation | Its headline is an average across weapons. Store per-weapon reports separately; averages are not universally applicable modifiers. |
| [WZStats DMZ](https://wzstats.gg/mw4/dmz) and [Han 86](https://wzstats.gg/best-loadouts/han-86-mw4) | Explicit DMZ and Multiplayer build sections, attachment names/levels, patch references | Parse the relevant section, not the whole page: headers/footer contain other games and beta history. Recommendations are editorial, not measured effectiveness. |
| [DMZ Codex attachments](https://dmzcodex.com/attachments/) and [FSS IS300](https://dmzcodex.com/attachments/fss-is300/) | Attachment identity, fit, effects, contextual cost/unlock and evidence links | Includes upcoming seasonal entries. Discounted cart prices must not become universal prices. Follow original footage/evidence for verification. |
| [ggranked Han 86](https://ggranked.com/games/call-of-duty-modern-warfare-4/meta/weapons/han-86) and [ranking method](https://ggranked.com/games/call-of-duty-modern-warfare-4/meta/weapons) | Additional attachment/stat reports and comparison | Its Total TTK includes one miss, ADS and sprint-to-fire; do not compare it directly to ideal firing-only TTK. |
| [COD Loadout methodology](https://codloadout.gitlab.io/mw4/data-and-assumptions/) and [attachments](https://codloadout.gitlab.io/mw4/attachments/) | Detailed provenance and downloadable structured-data discovery | Reports 615 attachment entries and effect coverage for 972 of 1,589 weapon/attachment pairs. These are that site's reported counts, not our measured completeness. It derives much data from CODMunity/ggranked: not an independent confirmation. It flags missing effects and conflicting unlock levels. |
| [LoadoutVault weapon table](https://loadoutvault.com/mw4/dmz/weapons/) | Readable official-data cross-check | Repeats publisher data and exposes conflicting unlock criteria. Its calculated magazine-dump duration is not TTK. |
| [NOMADS](https://nomaddmzhub.com/) | DMZ-focused builder, names and contextual costs | Explicitly says weapon/attachment stats will be added later. Not a current complete-stat provider. |
| [MW4.online attachments](https://mw4.online/attachments/) | Evidence-labelled beta captures | Explicit beta/pre-launch source. Keep historical; not current-launch numeric authority. |
| [Sym legacy](https://sym.gg/legacy/?game=mw2&page=gunsmith) and [TrueGameData](https://www.truegamedata.com/) | Candidates for further checking | Sym page identifies MW2/legacy. TrueGameData returned no readable body in this check. Neither established current MW4 DMZ coverage; do not import older-game values under a new name. |
| [CyberneticPunks](https://cyberneticpunks.com/dmz) | Another official-baseline reference | Landing page read; weapons child fetch failed. Child coverage remains unassessed. |

Concrete discrepancies checked: the official launch page gives VEL 46 unlock level 5 in its progression table and level 13 in its weapon sheet. The [FSS IS300 evidence page](https://dmzcodex.com/attachments/fss-is300/) records different M4 and Han 86 cart prices, with a discount shown for one and unknown discount state for the other. Store those contexts rather than selecting a universal value.

This assessment does not certify every row of any provider. Search snippets were discovery aids; decisions above use opened pages. Related mirrors and aggregators must retain their upstream source relationships, not inflate confidence through repeated publication.

## Recommended data model

Keep versioned JSON as the source of truth and generate indexes for search. An optional local SQLite search cache could follow measured performance need; it must be rebuildable and must not hold the only copy.

| Entity | Required information |
| --- | --- |
| Weapon | Stable ID, provider IDs, aliases, class, availability state/date, manual/acquisition references, supported slots and source-backed base-stat observations |
| Attachment | Stable ID, provider aliases/IDs, slot, standard/Apex kind, short original explanation, reported pros/cons, source references |
| Compatibility | Weapon ID + attachment ID + game/mode/build, supported/blocked slots, conditions, provenance; an allowed slot alone does not prove a particular attachment fits |
| Stat observation | Metric, numeric or unknown value, raw value/unit, normalized unit if justified, game/mode/build, firing mode, target/body region/armor, distance band, loadout/stance, measurement method, source locator/date and confidence |
| Attachment effect | Weapon + attachment + metric + scope, signed change, operation (add/multiply/override/qualitative/unknown), baseline and preconditions; direction separate from sign |
| Cost/unlock observation | Currency, base versus discounted price, quantity/slot costs, prerequisites, weapon level and mode; preserve conflicting reports |
| Source/update | Canonical URL and section, upstream lineage, fetch/publication/review dates, content fingerprint, parser version, local permission provenance and proposed changes |

Recommended stat groups: damage by body region and distance, armor/AI context, pellet/burst count and burst delay; fire rate; ADS and sprint-to-fire time; tactical/empty reload and reload-cancel; magazine/reserve; movement/ADS movement/sprint; muzzle velocity and damage-range bands; recoil and dispersion; penetration; optical magnification, suppression and visible-laser behavior. List unknown values explicitly. Do not invent numeric values for qualitative behavior.

Explain effects in player terms: shorter ADS time improves aiming speed; larger magazine trades capacity against any reported handling penalties; suppressed shots and visible lasers need conditions, not a generic damage score. A positive percent on a duration can be worse. Conflicting measurement conventions need separate observations.

Do not add attachment percentages blindly. Keep the provider's combination rule as a source-specific model until validated; disable exact combined predictions for unknown stacking, missing effects or incompatible scope. Apex conversions may change firing mode, ammunition, capacity and legal slots, so they require more than a modifier list.

## Import and update design

1. Start with the official launch roster and basic observations; retain existing stable weapon IDs. Keep upcoming and historical records distinguishable from available records.
2. Add standard and Apex identities/compatibility from direct provider pages, retaining original upstream references. Read provider exports where available before building HTML parsers. Existing owner permission for additional local providers is recorded in the earlier source registry; no repeat permission request is necessary for this research. Public dataset/artwork redistribution remains separate.
3. Use explicit domain/path allowlists, bounded responses/timeouts, rate limits, cache validators where supported and inert parsing. No login/paywall bypass, arbitrary asset fetch or executable scraped content. Keep local-only snapshots/import caches out of public history.
4. Stage normalized proposals; validate identity, scope, units, slot compatibility and source references. Uncertain mode/units go to review, not the confirmed DMZ column. Preserve missing as unknown, never zero.
5. Show added/changed/disputed/stale reports before applying. Use provider IDs plus explicit reviewed aliases; fuzzy names may suggest matches but cannot automatically merge attachments. Distinguish one shared attachment from its many compatibility/effect rows.
6. Applying the same snapshot twice must be a no-op. Reordered rows and tracking-query changes must not create duplicates. A disappeared record becomes missing/stale pending review; it cannot silently erase owner corrections or private state.
7. Changes apply transactionally with rollback and a retained previous valid catalog. Provider outages/partial pages never wipe data. Link every displayed claim back to its source and expose its mode/build/date.

## User interface to build next

A compact searchable weapon table, grouped by class; weapon detail pages with base stats, evidence badges and source history; attachment lists filterable by slot/compatibility with plain-language tradeoffs; side-by-side comparison with explicit mode/build/target; and a coverage/update review screen. Base measurements, predicted build values and editorial builds must be visibly distinct. Integrate existing navigation and preserve mobile, 200% text and keyboard operation.

## Delivery slices and verification

1. Official roster expansion and explicit known/unknown coverage, retaining existing IDs and profile references.
2. Reviewed attachment/effect contract and schema migration with backward-compatible imports/exports and Studio support.
3. Bounded provider adapters and staging/diff/apply pipeline, followed by safe local population. Reconcile discrepancies against direct sources or owner gameplay evidence.
4. Compact weapon/attachment reader and source-aware comparisons. Add exact build simulation only for supported, validated combination rules.

Tests must cover repeated updates, cross-provider aliases, names shared across games, signed effects, unknown versus zero, missing units, MP/DMZ/Warzone separation, beta versus launch, upcoming availability, incompatible/Apex-blocked slots, burst/pellet/armor TTK assumptions, contradictory prices/levels, derived-source lineage, malicious/partial imports, rollback, retained profile references and keyboard/mobile behavior. Compare TTK only under the same health/armor/body/range/firing assumptions; do not claim an all-target best weapon.

Research is sufficient to define the implementation feature. A complete verified current-DMZ numeric dataset has not been established; the product must expose coverage gaps rather than claim every possible stat is known. No catalog population, schema migration, scheduled scraping or gameplay files were changed during this research.
