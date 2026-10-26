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

The admitted observed pack is exactly eight definitions/31 requirement rows/22 labels. Earlier research remains separate; its one matching Stash Weapon I observation is not another purchase, and the combined14-name research inventory is not a verified compatible catalog. Further admission and mechanic changes need separate scoped evidence review. Studio guided fields, advanced JSON, repository saves and portable exports preserve v2; changing a catalog's format identity through an ordinary advanced edit is not a migration shortcut.
