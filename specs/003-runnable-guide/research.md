# Architecture spike decisions
2026-10-21. Bounded design/spike, not a performance claim.

Decision: plain JS static generation with progressive native ES modules.
Rationale: a generated directory index is directly readable without scripting or a server runtime. Node filesystem/string templates are enough for a compact original design; pure domain modules can be shared by browser and node:test with no transform. Direct routes and relative same-origin assets work under a local static server and static hosting. Costs: routing/template composition and escaping must be tested here rather than delegated to a framework.
Alternatives: Astro plus React islands offers templating/ecosystem, but adds multiple dependency/update surfaces and hydration semantics for this small app. SPA-only Vite/React conflicts with native no-JS reading unless additional pre-rendering is added. Server-heavy framework offers no needed capability. Framework choice is reversible behind content/domain contracts.

Spike acceptance: build will emit index.html plus independent catalog and entity directory pages; serving a deep URL must return its own readable content with JS disabled; no catch-all fallback. This empirical check remains T002/T004, not claimed passed yet.

Decision: IndexedDB atomic single-transaction profile save with expected revision and a preserved previous snapshot. Unlike multi-key localStorage, transaction boundaries cover revision verification plus update. Memory-only fallback keeps UI usable but must display unsaved state and offer export. Theme only may use guarded localStorage. Content/private profile never share exports.

Decision: fixture demo pack separate from game starter pack. Schema source-backed weapon existence does not imply verified numeric stats. Unknown build/values remain explicit; disputed printer level claims coexist. No map art is copied.
