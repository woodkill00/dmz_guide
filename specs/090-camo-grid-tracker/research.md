# Research: camo grid tracker integration

Observed 18 November 2026 against the existing repository. This audit used local code and the checked feature-089 catalog; no new web collection or production edits were performed.

## Decision: extend the existing armory workspace

Use an additive, optional top-level `camoCompletions: string[]`, with at most 2,048 unique canonical keys. Keep armory version 1, the IndexedDB database/store/envelope, revision compare-and-swap, and previous-snapshot recovery. Legacy absence means no camo marks; do not reject or rewrite a legacy backup merely because the field is absent.

Canonical identity forms are `weapon:<weapon-slug>:<camo-slug>` and `shared:<camo-slug>`. Divergence and the six MP/DMZ mastery definitions have shared identities. The current catalog has 35 × 18 weapon-scoped definitions plus seven shared definitions: **637 distinct completion identities**, despite 875 displayed cards. A shared completion must update every associated weapon display without creating duplicate saved copies.

Bound slug segments and the full key length, reject malformed/mixed-case/duplicate values, and validate presence separately from absence. A present `null`, object or non-string array member is invalid. Do not import unknown top-level fields as part of making this one field optional.

Grammar validation and current-catalog membership are different concerns. Preserve syntactically valid archived/future completion keys through unrelated writes and backups; display only keys belonging to the active reference. New UI writes must use the canonical key factory. Known shared definitions must not acquire weapon-scoped aliases. Document the treatment of semantically misplaced imported keys rather than silently normalizing them into additional completed goals.

## Existing integration paths

| Path | Current behavior | Required feature treatment |
|---|---|---|
| `src/domain/armory-workspace.mjs`, `validateArmory` | Exact top-level fields currently exclude the proposed field; applies aggregate node/byte bounds. | Admit only this optional addition and validate its collection/keys; retain all existing validation. |
| Same module, `parseArmoryBackup` | Validates the backup envelope and delegates workspace validation. | The shared validator change permits both old and new backups; reject malformed completion data before preview. |
| `src/storage/armory-store.mjs`, `saveArmory` | Validates candidate, revised result and previous state; commits current/previous atomically with expected revision. | Reuse this path. No separate camo store or independent write transaction. |
| `src/client/armory-workbench.mjs`, `mutate` | Clones the whole workspace before modifying builds, evidence or acquisition. | Existing clone preserves the new field once validation accepts it. Test actual unrelated saves. |
| `src/domain/weapon-acquisition.mjs`, `editAcquisition` | Validates, then clones the full workspace and changes only the acquisition entry. | Existing clone preserves camo marks; add a regression for manual/count/blueprint edits. |
| `src/client/weapon-acquisition.mjs` | Loads the armory envelope, uses the shared validator/store, exports full saved or failed candidates. | Accept the additive field and retain it through save, retry, reload and exports. |
| Workbench saved/unsaved backup exports | Serialize the complete workspace without projecting a field list. | New field is naturally retained; preview/download counts should mention camo marks. |
| Workbench restore / previous snapshot | Validates and replaces the entire workspace through the revision-bound save path. | Explicit replacement semantics apply. Restoring an old backup without marks clears current marks; do not accidentally merge them. Preview that result and preserve the previous snapshot. |
| `src/domain/workspace-manifest.mjs` | Mixed backup embeds original module JSON text with byte length and digest; identifies armory by its envelope. | No armory projection or new bundle format is necessary. Prove exact module round-trip and owner-side restore. |
| `src/client/workspace-backup.mjs` | Downloads a checked module for its owner tool; performs no armory restore itself. | Continue routing armory restoration to workbench. |
| `src/client/weapon-manager.mjs` | Manages public weapon data; no private armory rewrite found in this audit. | Do not connect public catalog changes to automatic completion deletion. |

No existing examined mutation rebuilds the armory from a narrow list of known fields. The principal compatibility blocker is the exact top-level validator. Existing full-object clones and exports are suitable preservation mechanisms, but browser regressions must prove their integration after the addition.

## Tracking order is an explicit user workflow

The requested Military-eight → all three Specials ready → Gold-after-three-Specials flow is a **tracking order**, not a claim about actual in-game Special challenge eligibility. Feature 089 retains the raw level requirements and official explanations; those remain available beside this workflow.

Use completed/ready/blocked text and accessible state in addition to green/yellow/red. Recorded completion takes precedence over readiness: removing an earlier mark must not erase later marks or turn an already checked goal into an unrecorded one. Do not auto-complete prerequisites when a later card is marked. Derived counts must use canonical identities, not rendered card instances or filter-visible rows.

Four grid tiers are presentation groupings; shared mastery can be associated in the reference without duplicating persistent state. Catalog display order must not become an accidental prerequisite chain between every neighboring card. In particular, the three Specials become ready together under this requested workflow.

## Reviewed class Gold thresholds

Local evidence: `src/ui/weapon-camos.json`, each weapon's `platinum` requirement. The checked catalog retains launch-class counts even where Season 1 enlarged the roster.

| Class | Gold threshold in source | Current weapons |
|---|---:|---:|
| Assault rifle | 8 | 9 |
| SMG | 5 | 6 |
| Shotgun | 2 | 2 |
| LMG | 3 | 3 |
| Marksman rifle | 3 | 3 |
| Sniper rifle | 3 | 3 |
| Pistol | 4 | 4 |
| Launcher | 4 | 4 |
| Melee | 1 | 1 |

Use an explicit reviewed mapping whose values match all applicable source rows. Do not calculate the requirement from current class length, change it after a roster update, or parse arbitrary prose into new gameplay rules at runtime. A source mismatch should fail the mapping check and require review. Cross-weapon Harmonic Break / Divergence reference thresholds remain separately specified; neither uses 875 rendered cards as its denominator.

## Contract risks and verification

1. **Field loss / rejection:** new stored workspaces become unreadable if any owner still uses the old exact validator. Verify acquisition and workbench hydration, mutations, saved/unsaved export and restore against the same module version.
2. **Cross-tab overwrite:** the new grid must load the complete armory and save through its current expected revision. On conflict retain the attempted candidate for export; do not retry automatically against a newer revision.
3. **False saved state:** update the durable workspace and success announcement only after transaction completion. Quota/abort failures must retain marks as an explicit unsaved candidate with retry/export/reload controls.
4. **Replacement ambiguity:** restore previews must distinguish legacy absence from malformed values, show the incoming mark count, and state replacement. Previous snapshots must keep their own original completion fields.
5. **Duplicate identities:** verify one shared key survives marking on one weapon, navigation to another, unticking and reload; prohibit per-weapon copies of the seven shared definitions.
6. **Catalog evolution:** retain archived syntactically valid keys during unrelated edits; keep completion data out of public acquisition/camo catalogs and shared-build exports.
7. **Resource admission:** the 2,048-key limit is additional to existing whole-workspace node/byte limits, not a promise that every collection maximum fits simultaneously. Validate before commit and before restore preview.
8. **Backup integrity:** mixed bundles must retain exact armory module text/digest. A bundle inspection is not semantic armory validation; owner-side validation remains required.
9. **Workflow accuracy:** test completed-state precedence, no cascading deletion, no implicit prerequisite completion, simultaneous readiness of all Specials, and class counts independent of filters or current roster growth.

Meaningful verification should combine domain tests for limits/canonical mapping and state preservation with browser scenarios for real controls, failed saves, stale revisions, replacement/previous recovery and mixed-bundle round-trip. No new artwork or provider collection is required for this feature.
