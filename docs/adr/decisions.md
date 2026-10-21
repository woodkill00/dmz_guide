# Architecture decision register
Status: recommended, subject to owner review and the specified spikes.

ADR01 Static-first Astro + React islands preferred. Alternatives: React/Vite SPA with explicit prerendering; Next.js all-in-one rendering. Astro fits public guide reading and isolated planner/map/editor; Next fits future authenticated server features but adds rendering/cache/hosting choices now; SPA simplifies shared state but needs extra SEO/no-JS work. Choose one after a small route+planner spike, not a hybrid of all three. Revisit when authenticated server workflows are truly required.

ADR02 Public content and private state separated. Published validated packs plus IndexedDB local state. No automatic remote profile storage. Cost: backup/migration/eviction handling. Revisit on demonstrated cross-device need with new privacy/security design.

ADR03 Shared contract, dual execution. JSON Schema and shared semantic validator for public build-time compilation and private runtime imports. Cost: browser-safe validator and version migrations. Reject build-only imports and silent schema coercion.

ADR04 Requirements planning is not execution. Pinned alternatives, acyclic supported recipe graph, aggregate batch demand, shared one-time upgrade closure; strict reservation default. Separate executable-now trial schedule and explicit optional work-conserving skip mode. Cost: conservative results and visible unsupported cases. Revisit optimization only with objective, correctness proof/test oracle and realistic scale.

ADR05 Typed mechanics. Currency costs, item consumption, retained tools, gates, produced items and progression effects are distinct. Future surplus is projected, not owned. Cost: richer schema. Never derive effects from display text or assume tier numbering proves dependencies.

ADR06 Portable assets with hard boundaries. Reference packs may omit assets only with visible diagnostics; full picture-pack completion requires bounded self-contained raster bundles. Reject executable formats, arbitrary network fetch and unsafe archive entries. Cost: decoder/resource testing. Revisit formats only with threat model and rights.

ADR07 Canonical map coordinates. Fixed declared map units and coordinate-space version independent of image pixel resolution. Use Leaflet CRS.Simple adapter initially, with calibration and list parity. Cost: editor calibration and version migration. Revisit renderer on measured marker/geometry performance, not trend preference.

ADR08 Task-centered navigation. At most five bottom tabs, More for community/settings; compare Saved/Plan wording and retain obvious home planning entry. Cost: task study and fewer visible categories. No direct transplant of an eleven-category game rail.

ADR09 Curated publication. Private edits/export first, owner-reviewed correction workflow, verified Discord link. Public correction instructions exclude personal profiles, player identifiers and raw screenshots. No anonymous server submission assumed. Cost: moderation turnaround. Revisit on contributor volume and staffed governance.

ADR10 Factual provenance and disputes. Preserve all conflicting sourced claims and applicability. No newest-source-wins or majority-vote truth. Unknown/disputed gates cannot assert ready. Cost: some advice remains conditional. Revisit each claim with stronger current evidence.

ADR11 Storage and safety lifecycle. Atomic imports, explicit selected-profile replace after diff, backups, cross-tab revisions and orphan preservation. Do not sum two snapshot inventories. Known unsafe packs blocked; stale editorial packs warned; offline trust freshness disclosed. Cost: more recovery UI. Never erase progress because content was revoked.

ADR12 Evidence-driven release. Current Spec Kit full cycle, per-slice preimplementation analysis and post-implementation convergence, plus independent automated/manual acceptance. Cost: slower than one-shot generation. No “tests passed” before actual run; no requirement checklist auto-approval by implementer.

ADR13 Lean launch expansion. No worker until profiling; no service worker until S8; fork-and-replace local content before overlay rebasing; no live telemetry, realtime squads or unlicensed assets. Requested maps/story/editor/community remain S4-S7 roadmap commitments, not discarded non-goals.
