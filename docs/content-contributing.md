# Contributing game information

You do not need to code. A useful contribution explains what is wrong or missing, where the evidence comes from, and which game build it applies to.

## Start without editing files

Open a content-correction issue with the entity name, current claim, proposed correction, source URL, relevant publication/capture date and game/build/season. If the exact build is unknown, say so. Describe conflicting evidence rather than choosing the most convenient value. Never post account details, private profiles or original private screenshots.

A reviewer will classify the claim as verified, disputed, stale or unknown and connect it to affected recipes, progression and guides. An accepted report is not automatically published content.

## When JSON editing is introduced

Production content schemas and the editor are still planned. Do not assume the example below is an accepted import format or invent a content directory. Use the actual schema and validator established by the owning implementation feature once available.

This is a **synthetic proposal example**, not a real item or an importable record:

```json
{
  "id": "synthetic-example-material",
  "name": "Synthetic example material",
  "gameBuild": "unknown",
  "verification": "unknown",
  "sources": [],
  "notes": "Fixture only; not a game claim"
}
```

For an approved schema, copy a similar validated record, preserve stable IDs, edit only intended fields, run the documented schema/content checks, inspect the diff and submit a pull request linking its scoped change artifacts. Do not change a schema merely to make a bad record pass validation.

## Review checklist

- Identity, quantities, units, consumed/retained requirements and applicable build are explicit.
- Each factual claim has evidence and a review date; unknowns are not converted to zero or false.
- Conflicts are retained with competing sources. High-impact crafting/unlock claims receive domain review.
- IDs and dependencies remain valid; no duplicate entities, broken references or unsupported cycles.
- Images have recorded redistribution rights and attribution. Content is free of personal information.
- Affected planning outputs, migration needs and stale records are considered.

Private editing and public publishing are different actions. Local changes must never silently become public contributions. See [patch review](content-maintenance.md) for ongoing maintenance.

## Upgrade observation schema v2

V1 packs remain readable without a disk rewrite. V2 requirements represent `quantity: null` and `consumption: unknown` explicitly; never substitute zero, `false`, or an assumed consumed flag. Each row keeps evidence status and source IDs. Upgrade objectives remain one-time `dmz-upgrade` records with separate tier text, observation lineage and known/unknown prerequisite completeness. A missing lower tier is not an inferred edge.

A v2 source uses typed provenance. Web sources require safe HTTP(S) URLs. Private observations may have a null URL; a non-null link is a labeled public transcription, never an invented original image. Public-safe observation/lineage keys are not storage IDs or source hashes. Capture/build unknowns remain explicit. Original screenshots, personal balances, progress, Library IDs and private paths must not enter the public pack or Git history.

The original observed baseline remains eight definitions/31 requirement rows/22 labels. Feature032 expands the same catalog while preserving those IDs and original rows; its separately attributed community-source additions are documented in [the scoped source review](../specs/032-sourced-unlocks-catalog/research.md). Earlier research remains separate; its one matching Stash Weapon I observation is not another purchase, and the combined14-name research inventory is not a verified compatible catalog. Further admission and mechanic changes need separate scoped evidence review. Studio guided fields, advanced JSON, repository saves and portable exports preserve v2; changing a catalog's format identity through an ordinary advanced edit is not a migration shortcut.

The observed catalog now cites a separate dated owner-report source for consumption of its existing31 costs. Original observation/capture uncertainty remains; do not relabel the screenshots as proof of consumption or current eligibility. New profiles for v2 packs use private profile v3 (the content schema stays v2). Purchase history snapshots preserve original upgrade/item IDs, full game/mode/build scope, observation keys, item kind/unit, cost and stock arithmetic. Shared provenance lineage alone is not purchase identity. Editing current costs/units or retiring records never rewrites prior recorded spending. Private profiles/history are not repository content or publishable observations.


## Community-source expansion (032)

The three user-selected Detonated reports provide 28 FOB definitions, 75 recipe identities/77 unlock routes and 69 level milestones/90 reward entries. They are not official or current-build verification. New rows remain unverified; new consumption and absent prices remain unknown. Eight null cash rows include appended corrections to Vendor I and MIA III. Do not extend the owner’s earlier consumption report beyond its original31 rows.

Keep unlock references on the progression track rather than creating zero-input recipes or inventing output yields. Preserve alternatives and disputed claims; never turn separate NVG routes into an AND dependency. Level rewards do not automatically grant stock, unlock recipes, or establish numbered FOB tier prerequisites. Source aggregates are not personal shortages. Use the typed field claims for factual kit contents and station conditions; do not copy article prose, images or raw downloaded HTML into the repository.

Content updates advance contentVersion, not pack/game identity. Test explicit rebind and unchanged immutable ledger snapshots. Changed evidence may require review, but never reconstruct historical costs from current definitions. Public content publication still requires separate authorization and review.
