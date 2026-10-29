# Independent design review — 2026-10-28

Reviewer: independent source reviewer. Scope: spec, clarifications, plan, tasks, research, data model and quickstart; current source pages independently fetched and compared to the original eight observation definitions. This is a design review, not implementation acceptance.

## Findings

1. **Medium, resolved — source totals versus player advice.** US1 currently promises aggregate counts matching all listed tiers, while the plan intentionally withholds executable counts for unknown consumption. Distinguish the source-reference arithmetic oracle (889 materials, incomplete cash subtotal 2,840,000) from personal Keep/Search results. Preserve missing/unknown semantics; do not weaken unknown consumption merely to reach an aggregate.
2. **Medium, resolved — record classification.** Specify the objective track for manual recipe/level records and require that they never expose upgrade-purchase actions. Empty cost arrays must not become free upgrade purchases or executable crafts.
3. **Medium, resolved — spoiler projection.** Story route claims may be spoiler-sensitive. Item descriptions, guides and generic detail claims must preserve existing spoiler settings, not leak mission names from otherwise hidden objectives.

## Verified source baseline

FOB: 28 definitions, 37 noncash identities, 75 material rows plus 20 known cash rows and eight unknown prices. All keep-list counts equal the sum of individual rows. All 31 prior observation requirements agree. Recipes: 77 route entries, 75 unique identities; no craft quantities/yields provided. Levels: 69 milestones (2–70), 90 reward entries. UAV route conflict, NVG dual routes, unspecified level 40/54 identities and Simone wording remain unresolved facts rather than inferred mechanics.

## Verdict

PASS after owning-artifact corrections: US1 separates reference totals from personal advice; FR-008 and plan assign the progression track; the plan protects story objectives/the guide and omits mission names from ordinary item descriptions. Claims must follow their target record’s spoiler visibility in actual browser verification. No remaining design-level factual or privacy blocker identified. Subsequent verification must cover immutable historical transactions, explicit rebind, null cash refusal, source attribution, actual user-visible navigation and mobile rendering. No public publication approval is granted by this review.
