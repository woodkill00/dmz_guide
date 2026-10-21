# Implementation Plan: Runnable guide foundation
Branch: 003-runnable-guide. Date: 2026-10-21. Spec: spec.md.

## Summary
Implement S0–S2 as a small, real multipage static website: public content is pre-rendered HTML, progressive enhancements are native ES modules. This is first increment of a continuing 003–008 delivery sequence, not removal of later roadmap scope.

## Technical Context
Language/runtime: JavaScript ES modules, Node 22+ build/test, browser HTML/CSS. No production framework dependencies. Unit tests use node:test; browser acceptance uses Playwright against Chromium. Build produces dist/ with directory index routes; start serves the actual generated files without SPA fallbacks. Styles use system fonts, CSS grid/clamp/calc, graphite/gold/lime tokens. No CDN, analytics or remote fonts.
Storage: IndexedDB atomic record transactions with separate content/profile stores; memory fallback explicitly unsaved; revision checking prevents stale writers. JSON backup staging is inert and bounded. Profile values are integer 0–1,000,000, single manual pool, protected reserves, completion tri-state; versioned profile and content binding.
Performance: 200 KiB compressed route script budget, 350 KiB HTML/CSS/text. Lab reports specify CPU/network/browser, not field claims.

## Constitution Check
Player outcomes, accessible semantic routes, provenance/unknowns, separate private state, pure explainable domain and local validation are preserved. Original assets only. No accounts/services/hosting settings. S0–S2 combines tightly coupled schema/shell/one useful plan as permitted by foundation first-feature boundary; 004–008 preserve later separate slices. Constitution status remains a baseline; no silent amendment. Independent reviewer owns requirement acceptance.

## Project Structure
scripts/build.mjs and scripts/serve.mjs; src/ui/render.mjs and src/styles.css; src/client/ entrypoints; src/domain/; src/content/; src/storage/; schemas/; content/packs/; tests/runtime/ and tests/browser/. Generated dist is ignored. Existing bootstrap tests remain intact.

## Phase 0 Research
See research.md for bounded architecture spike, storage tradeoffs, selected scope and unresolved content boundaries. Schema proposal is reviewed before parallel authoring.

## Phase 1 Design
See data-model.md and contracts/ui.md. Public generated routes never rely on a client router. Escape all data for HTML; use textContent in dynamic content. Public sources are allowlisted HTTP(S) links validated as inert strings, never automatically fetched from imports. No HTML/Markdown execution in authored text.

## Delivery and Verification
Generate tasks per US1–3 after reviewer checklist. Test pure calculations, malformed/oversized input and 100-operation conservation; run build, route and dependency bounds; browser no-JS, search/navigation, persistence/reload, restore/reset, tab conflict, mobile screenshots and keyboard. Run existing repository tests. Converge appends gap tasks, followed by independent review. Create PR, verify exact-head runtime+repo CI, merge only with passing review, verify exact-main CI. Then begin 004 immediately.
