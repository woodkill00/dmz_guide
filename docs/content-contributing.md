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
