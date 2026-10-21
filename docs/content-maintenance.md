# Patch review and content coverage

No complete production dataset exists. “Coverage not established” is the correct label until a scoped denominator and review process exist.

## Review a game update

1. Record the official patch/source URL, publication date and applicable game/build/season. Distinguish publication date from effective date.
2. Identify changed claims and dependent entities: a recipe quantity may affect goals, reservations, locations and guides.
3. Open a bounded content change with affected IDs, old/new evidence and unknowns. Do not silently overwrite historical applicability.
4. Mark affected uncertain records stale or disputed while reviewing. Preserve conflicting sources and avoid unsupported recommendations.
5. Validate the schema, references and domain invariants; rerun affected planner examples and relevant accessibility/journey checks when behavior changes.
6. Have a domain reviewer approve the claims and a rights reviewer assess changed assets. Record who reviewed what and when.
7. Publish through the normal reviewed change process with a content version and changelog; preserve rollback and migration compatibility.

## Measure honestly

For each scoped category, record expected-known records, reviewed records, stale/disputed records and missing required fields. Include the denominator's source and applicable version. Unknown denominator means no percentage-complete claim. A verified category label is not proof that every item or recipe is enumerated.

Retired content remains traceable. Security-revoked packs and editorially stale packs have different meanings and must not share a misleading status. Schema changes need compatibility/migration review and an ADR when they alter cross-feature contracts.

## Proposed cadence, not an active service

The content owner should assign reviewers for announced patches, unresolved high-impact crafting/progression claims, and periodic stable-guide samples. No automated monitoring or guaranteed review schedule is established by this document. Set realistic capacity and ownership before promising update frequency.
