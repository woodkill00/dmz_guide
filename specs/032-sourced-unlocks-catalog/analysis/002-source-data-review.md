# Independent source-data review — 2026-10-28

## Result
PASS for factual content at review time. This is not browser, full runtime, publication or game-build certification.

Reviewed sorted catalog JSON path/content digest (SHA-256): `801961a21f8ea1f43ef4a36c0232cb505ef2a046bacf6ce7a13fe37e5b4ee43c`.

## Evidence
- Independently fetched the three requested source pages and parsed their factual lists using a separate standard-library parser, not the implementation generator.
- Compared all 28 FOB definitions against source names, 75 material rows and 20 numeric/eight unknown cash prices. All match, allowing the existing W.M.D. punctuation normalization.
- Independently summed 37 material identities to 889 units. Every source keep-list quantity matches the corresponding per-upgrade total. Known cash subtotal is 2,840,000; this is not full cash cost.
- Deep-compared the original 31 observed requirement objects to Git HEAD baseline: all unchanged. Vendor I/MIA III append separately sourced null cash; source/observation identities remain present.
- Compared all 77 recipe routes and 75 deduplicated identities to the source list. UAV remains disputed; Night Vision Goggles retains distinct story and Order routes. No executable recipes or invented ingredient/yield quantities were added.
- Reconciled all 69 level milestones and 90 reward entries, including reward types, named kit contents, station details and ambiguity on levels 15/40/54. Physical reward items remain distinct from recipe unlocks.
- Original sources retain review dates and evidence limits. New sources are community/unverified, with safe source URLs and no claim of confirmed game-build applicability.
- No original screenshots, downloaded HTML, third-party images or private player state were added to this catalog.

## Findings and resolution
1. Fixed: broad dash normalization initially changed intra-word hyphens in reward identities. Rechecked 1-Plate, 2-Plate and High-Tenacity names after delimiter-specific normalization.
2. Fixed: station explanatory facts initially omitted from shortened labels now have structured claim details, including the weapon-manual purchase condition and printer categories.
3. Withdrawn after inspection: suspected missing kit contents were already present in reward claim JSON, separate from the short objective summary.

## Required downstream checks
Actual browser QA must verify generic reward-claim JSON remains readable on mobile and story claims stay inside spoiler disclosure. History/rebind/null-cash refusal tests and full regression checks remain the integrator’s implementation gates. This review grants no public-write permission.
