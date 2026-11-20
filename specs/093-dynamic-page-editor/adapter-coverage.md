# Adapter inventory and implementation coverage

Measured current source catalog:431 items,99 recipes,372 objectives,33 guides,3 maps,17 locations across four catalogs. This is record coverage, not current-game completeness. Official starter has87 Order/story records; the fictional training catalog has one synthetic Order. Stable catalog identities come from content/catalog/manifest.json; public detail routes come from allRecords/recordUrl, never display names.

T025 discovery parity: saved views of all six catalog groups, including weapon-kind items and upgrade objectives, expose exact repository Compose links when the matching published source exists. Private-only/protected/mismatched records receive no guessed repository target. Private-copy edits remain separate. Item-maintenance names link to native detail pages and its Edit actions open the composer; upgrade rows expose a separate full-page/edit link while retaining inline completion. Existing specialized editors remain the source owners listed below.

| Surface | Source owner | Editor target | Work |
| --- | --- | --- | --- |
| Hajin/X01 Orders and story | Catalog objectives; joined chapter intel is separate | catalog / immutable pack + objective ID | Layout/canonical fields implemented; separate Edit chapter report action for joined rewards. |
| Items/inventory references | Catalog items | catalog / item ID | Same composer and typed canonical fields; player quantities remain private. |
| Upgrades | Catalog objectives, dmz-upgrade | catalog / objective ID | Same composer; canonical costs/prerequisites feed existing planner. |
| Recipes/printer | Catalog recipes; X01-specific reference module | catalog for declared recipes | No conversion of reference-only X01 data into executable forecasts. |
| Guides/loot types | Catalog guides/locations | catalog / stable record ID | Shared layout, pictures and guided structured editor. |
| Maps/locations | Catalog maps/locations | catalog / stable record ID | Metadata/custom page editing; companion canvas/settings remain separate. |
| Weapon combat information | content/weapon-intel.json plus catalog identities | weapon-intel | Implemented typed source adapter; catalog item descriptions remain separate. |
| Manuals/blueprint identities | content/weapon-acquisition.json | weapon-acquisition | Source facts distinct from private ownership/extraction counters. |
| Camouflage requirements | src/ui/weapon-camos.json | weapon-camos | Source facts distinct from private shared/per-weapon completion. |
| Keys/access | src/ui/keys.json and supplemental/access records | key-reference | Joined access relations and local-only cached imagery need explicit ownership. |
| Boss reference | Existing companion private workspace | Existing boss checklist/settings editor | Not a registered repository target; private references/kills/tags/events remain in their owning workspace. |
| Chapter reports | src/content/mission-intel.mjs base plus content/mission-chapter-overrides.json | mission-chapter | Implemented rewards/notes/review-date overrides affect one exact chapter. |

Implementation: all catalog groups use the composer and existing guided schema fields. Specialized adapters save weapon intel, acquisition/blueprint references, camouflage requirements, base/supplemental keys and chapter reports. Their validator/save/reopen tests are in page-adapters.test.mjs. Acquisition/camo and key/access catalogs validate as one proposed snapshot. IDs and downloaded-image registrations remain read-only. Shared acquisition/camo name/category and key location name/grid are read-only with owning-workflow reasons; ordinary requirements and acquisition methods remain editable. Three-engine tests cover restrictions and supported saves. Chapter changes live in content/mission-chapter-overrides.json.

Boss references are owned by the companion private workspace, not a public canonical boss dataset. Use its [Boss checklist and settings editor](http://127.0.0.1:5175/?tool=boss-checklist). This feature does not advertise a fictional repository boss adapter or export private kills/tags. Loot-container guides use the catalog editor. Reference-only X01 printer data, map canvases, dashboards and private counters retain their owning tools; guide edits cannot manufacture executable recipes or change progress. Reserved boss-reference/loot-type-reference target grammar is not an editing-capability claim: unregistered targets fail explicitly.
