# Specification: trustworthy guide and first planning journey
Status: proposed; content/mechanics and product-owner assumptions identified separately.

## Product outcome
A player on a phone can find an item or upgrade, understand its uses and prerequisites, record what they own, and see what to collect next without losing track of longer-term goals. A community contributor can prepare a portable correction without publishing unreviewed material to everyone.

## Users and stories
- US1 Reader: search/browse items, recipes and guides; inspect source, freshness and relationships.
- US2 Planner: select goals, enter inventory, distinguish current achievable work from future gated requirements.
- US3 Contributor: edit local content, validate, preview a diff, export and safely re-import a pack.
- US4 Explorer: find relevant locations on a map or accessible list; connect to item/goal context.
- US5 Progress tracker: follow prerequisite chains, story and unlock progression without unwanted spoilers.
- US6 Community member: join the verified Discord and submit corrections through a moderated process.

## Functional requirements
- FR01: Default to dark on first visit; expose light/dark selection and preserve it. Reading works at 320 CSS px without horizontal page scrolling.
- FR02: Provide stable URLs, text search and filters for items, recipes, locations and guides. Preserve back-navigation search/filter context.
- FR03: Show source, verification status, applicable game/content version, review date and explicit unknowns for factual content. Separate community reports from official confirmation.
- FR04: Model items, quantities, currencies, recipes, prerequisites, effects, acquisition sources, maps and locations as referenced records with stable IDs, not text parsing.
- FR05: Store player inventory, goal order and progression separately from public content. Show save state, export backup, reset confirmation and recovery failures. No login required.
- FR06: For selected goals, calculate missing materials without allocating the same owned unit twice; show per-goal allocation, shared demand, currency costs, gates and uncertainty.
- FR07: Present collect-now and collect-later with reasons. Unknown unlock state must not be treated as confirmed unlocked or as absent. Explain what user input changes a recommendation.
- FR08: Local editing supports item/recipe/picture metadata, additions and corrections with validation; private changes are visibly private.
- FR09: Import/export versioned JSON packs and optional bounded asset bundles; preserve semantic content through round trips; incompatible or malicious packs leave the current state unchanged.
- FR10: Maps expose searchable/filterable location lists, selected-location details and item/goal relationships; all essential information remains available without dragging or zoom gestures.
- FR11: Progression represents prerequisites and completed milestones; spoiler content stays hidden until user choice. Completion changes do not silently consume inventory.
- FR12: Community entry uses an owner-verified Discord destination. No embeds, bots, account linking or public uploads by default.
- FR13: Published corrections require reviewable diffs, attribution/rights and schema/content checks. Local editing never implies publication.
- FR14: Content updates are version-aware; renamed/retired records preserve local-state recoverability through explicit migration mappings or an unresolved-reference report.
- FR15: App states cover loading, empty, error, offline/unavailable data, invalid imports, stale content, no results and storage/quota failures.

## Nonfunctional requirements
- NFR01 Accessibility: target WCAG 2.2 AA; design 44px primary touch targets; keyboard, screen reader, contrast and reduced-motion verification.
- NFR02 Performance: initial guide route target <=200 KiB compressed JS excluding separately loaded map/editor chunks; cold-cache mobile lab LCP <=2.5s and CLS <=0.1 on documented test profile. Field INP target <=200ms only after real-user data exists.
- NFR03 Correctness: deterministic results for fixed content/state; no negative quantities, over-allocation or silent content-version mixing; property tests for conservation and order stability.
- NFR04 Security: no executable imported markup, unsafe URLs or unbounded decompression; no arbitrary asset proxy, exposed credentials or unintended network requests.
- NFR05 Durability: import/edit commit is atomic, recoverable, and explicit; backups exclude private player state unless chosen.
- NFR06 Maintainability: independently testable domain engine, versioned contracts, locked dependencies and traceable tests.

## First feature boundary
001 establishes app shell, trusted schema and fixtures, searchable item/recipe detail, local inventory plus one selected goal, explainable shortages and a safe private-profile JSON backup round trip (content-pack editing/import belongs to S4). Full multi-goal allocation, richer editor, map, progression and community slices follow. Acceptance fixtures are labeled synthetic or screenshot observations, never asserted as verified game facts.

## Non-goals for initial release
Gameplay telemetry, game-account login, automatic inventory detection, real-time squad sync, server-side user accounts, unrestricted UGC, economy/route optimality claims, scraped competitor assets, paid services, Discord bot permissions, and live integrations requiring secrets.
