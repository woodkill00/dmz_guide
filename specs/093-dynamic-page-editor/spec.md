# Dynamic page editor

Status: implementation authorized2026-11-18 after planning analysis/fix cycle. Final verification tracked in acceptance.md.

User: improve the full repository and plan editing items, upgrades, missions and other pages directly from Edit, with arbitrary section/photo placement. Clarification: Save writes to the local repository through Content Studio. Public editing later requires approved accounts; it is not enabled by this feature.

## User stories

- US1/P1: Open Edit on a specific record and immediately see that exact page, with its fields and sections ready to edit.

  Navigation acceptance clarified by the owner's Page1 report: every Orders page-group heading links to its own Hajin/X01 group detail, with a chapter Edit page action. Each non-spoiler mission name links to its individual detail and exact mission Edit page action. Group rewards/notes/layout and individual mission tasks remain in their existing distinct source owners.
- US2/P1: Add a section, place text and pictures between steps or beside one another, reorder content, preview and save it to the repository.
- US3/P1: Edit structured requirements or mission steps without breaking inventory, collection calculations, links or saved completion.
- US4/P1: Recover unfinished changes and pictures after a refresh, failed save, conflict or interrupted author transaction.
- US5/P2: Use the same editing experience for catalog records and specialized weapon/key/boss pages; see accurate capability information for every route.

## Requirements

- FR01 Identity: one Edit action resolves an exact immutable target through a registered adapter. Name changes preserve links. Invalid, deleted, ambiguous and mismatched targets fail visibly. No guessed first record, arbitrary filesystem path or arbitrary return URL.
- FR02 Entry: while the author service is running, Edit opens the matching editor with a live preview. If unavailable, show the existing explicit startup instructions and exact record link. Do not silently start/probe services. Standard local-launch tooling will offer an explicit author-mode option.
- FR03 Workbench: desktop section outline, live preview and selected-section controls; when available workbench width is below 900px (including space taken by navigation) switch to Outline/Preview/Fields tabs. Persistent compact Save bar contains draft/saving/saved/conflict state and exact destination. No full-page overlay for routine fields.
- FR04 Composition: add, rename, duplicate, reorder and remove custom sections; insert paragraph, heading, list, instruction steps, callout, image, gallery, table and record/map-link blocks at any insertion boundary. Standard sections can be reordered or collapsed; required identity/evidence notices remain available. Duplicate creates fresh stable section/block IDs.
- FR05 Pictures: upload or choose existing local assets, position before/after a step or in a two-column text/image group, crop and select contain/cover, set focal point, caption, contextual alt text and source/rights. Image layout never stretches a source beyond its available resolution without a warning. Keep originals and shared asset references intact when replacing/removing a placement.
- FR06 Structured facts: separate Content & layout from Data & requirements. Managed requirement/reward/statistic tables reference canonical fields rather than copied text. Typed changes validate source scope, units, known/unknown and dependency links. A reference list shows affected recipes, upgrades, missions, planner and search before saving semantic changes. Presentation edits never mark objectives complete or grant inventory.
- FR07 Save: reuse the repository author's strict validation, revision comparison, transaction journal and retained old bytes. Save succeeds only on confirmed commit. Preview is the same renderer used by saved/public pages. Unsaved draft autosave is explicitly labelled Recovery draft, never Saved to repository. Conflicts retain/export the draft; no last-writer-wins or silent replay. The reader updates only after a successful build; saved author preview is immediately available.
- FR08 Recovery: local recovery includes pending picture bytes and base revision, undo/redo within a draft, unsaved-leave protection, restore preview and bounded export/import of a page document plus its pictures. Missing/blocked/quota-exhausted draft storage cannot replace a valid saved page. Interrupted repository transactions retain existing manual recovery semantics.
- FR09 Sources: record base fingerprints and provenance. A refreshed provider record cannot overwrite custom sections; show changed/deleted fields and require review where both versions changed. Never infer current-game verification from a manual edit or imported image.
- FR10 Coverage: inventory every editable route and adapter first. Catalog items/weapons, recipes, objectives/upgrades/Orders/story, guides, maps and locations are required. Register specialized weapon/acquisition/camo/key/boss/loot-type detail routes with concrete adapter ownership or an explicit read-only reason. Dashboard/list/map canvases use their owning settings/data tools; they are not arbitrary record pages. No broken Edit control may be advertised as supported.
- FR11 Accessibility/layout: keyboard controls, focus restoration, Move up/down and Move to section alternatives to drag, meaningful image descriptions, reduced motion and spoiler settings. No page-level horizontal overflow at 320–1920px or 200% text; wide data tables get their own labelled scroll container. Two columns stack on narrow screens. User layout controls cannot introduce arbitrary CSS, scripts, iframes or inaccessible color combinations.
- FR12 Boundaries: local repository authoring only, existing loopback/session/origin protections retained. Static reader/release has no write API. Plan approved-public-author roles as a later backend feature; hiding an Edit button or setting a frontend flag never grants write authority. No account, deployment or public backend is implemented now.

## Success criteria

SC01: An item, upgrade and Order can each be opened from their page, edited with a new illustrated section, saved, reopened and rebuilt with identical rendering and stable links.
SC02: A known requirement edit changes the owning canonical field once and produces the expected inventory/Needed/Quick collect result after the normal explicit version-rebind flow, without changing quantities or completion. A layout-only save does not require a factual content-version change.
SC03: Draft reload restores text, order, prepared pictures and exact base revision. Conflict/quota/interrupted-save fixtures preserve the previous valid page and expose recovery.
SC04: Coverage registry has no unclassified editable route. Supported adapters have source→editor→save→reader roundtrip tests; read-only scopes have useful destinations.
SC05: Three browser engines pass pointer/keyboard/mobile/light-dark/visual tests, media-failure tests and semantic tracker regressions. Malformed blocks/assets/references and unsupported future schemas fail closed.

## Clarifications and limits

Repository save is the explicit user-selected default. Recovery drafts are local to that browser/origin and are not a backup or sync. First implementation keeps existing nine distinct pictures per record (primary plus eight additional), 2MiB/2048px per picture and current shared catalog/transaction/portable-bundle ceilings. The same asset may be placed in several sections. Higher capacity needs a measured follow-up, not a silent limit increase. Fully customizable means ordered safe content blocks and responsive templates, not unrestricted HTML/CSS or changes to application navigation/authorization.

Rollout clarification2026-11-18: user selected Orders first, then items and upgrades. The first complete editing journey covers Hajin and X01 Orders, with photos between task steps and correct audit links. Shared save/recovery/validation prerequisites remain required before that rollout.
