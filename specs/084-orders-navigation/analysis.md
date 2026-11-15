# Pre-implementation analysis

FR-001–FR-004 map to the existing mission directory and roster IDs. FR-005 requires link generation in both shared navigation variants and a client-rendered anchor scroll. FR-006 requires an end-to-end menu click rather than string inspection alone. No catalog or storage contract change is needed. No blocking ambiguity remains.

## Build-size finding and resolution

Generating 29 page links into every static page exceeded both topology byte and data-node limits. Moving those links into the existing navigation enhancer retains native disclosure controls and creates links on first expansion. The static menu still has the primary Orders link; the Orders page lists every roster without JavaScript-generated navigation links.

## Browser regression finding

The broader browser suite exposed test selectors that matched every summary under `.nav-more`. With the new nested native disclosures, those selectors become ambiguous. Scope top-menu selectors to `.nav-more > summary`; keep the nested summaries accessible as distinct controls. Scope corresponding CSS so the outer menu styling does not override the page subsection styling.

The runtime search-scope assertion also expected the old “Missions & story” label. Its expected title now matches the requested Orders label; the map mission tracker remains a distinct entry.

The compact-layout browser test counted every descendant menu group and expected five. Orders adds a nested group inside the existing Guide/Track group. The check now counts five top-level groups, while the focused Orders browser test covers the nested section. The 96-case compact UI test passed after this adjustment.

The 071 registry coverage fixture intentionally locks the old internal feature label. Changing that label failed its historical snapshot check. The registry entry remains “Missions”; `featureLabel` and the visible legacy menu say “Orders”. The focused registry and search-scope runtime tests pass with this split.
