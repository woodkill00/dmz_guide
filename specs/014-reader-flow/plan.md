# Implementation Plan: Clear reader flow
Branch014, 2026-10-22. [Specification](spec.md).
## Summary and Technical Context
Existing ECMAScript modules/CSS, Node>=22, Playwright1.58.2. No new dependencies. Keep static reader, IndexedDB/profile/ledger schemas and semantics. Small pure token/context helper with bounded per-tab sessionStorage navigation. Hash consistency is not authenticity.
## Constitution Check
Before/after design: player journey, static fallback, accessibility, factual unknowns, inert bounded input and private-state boundaries preserved. No governance amendment or launch. Independent checklist and baseline gates precede production; exact browser/visual evidence required later. Socket EPERM never bypassed.
## Ownership and Structure
Own src/domain/reader-flow.mjs; src/client/{planner,catalog,local,maps}.mjs; src/ui/{private-pages,maps-page,render}.mjs; src/styles.css; tests/runtime/reader-flow.test.mjs; tests/browser/reader-flow.mjs; specs/014-reader-flow/**. Integrator explicitly delegates only common init(render,{requestedPack,opaqueContext=false}={}) hook in contract. All other common/profile/schema/runners/CI changes remain integration-owned. Preserve012 focus/warning/save/recovery and011 modalfix; inherit013 readiness/matrix.
## Design
Quantity copy and focused zero-goal action; shortage navigation to exact private reader/maps. Bounded opaque handoff validates full-pack digest before target rendering. All-token visible search with stable order; only public pack/type persisted; home query token transfer is local-only. List leads unplottable maps; calibrated filtered-empty distinct. Neutral readable source badge/caveat, functional metadata>=.875rem, current secondary section label, visible central warning before author actions. Smaller mobile decorative space/card padding, never smaller text or targets.
## Verification and Risks
Baseline controller/render probes first; exact handoff denied/stale/expired/hidden cases. Actual hosted Windows/Linux Chrome and Firefox/WebKit strict health; full-page tiles/320/390/desktop dark/light/200%/keyboard. Compare measured dimensions against baseline. No browser pass inferred from source. Pack hashes taken full pre-projection and checked after awaits against current selection. Expired transient handoffs may be dropped; profile/content/backups untouched.

Search scope is public catalog and private record listing, not map/progression filter semantics. Existing explicit selected-pack navigation URLs remain supported; shortage handoff itself exposes only opaque tokens.
