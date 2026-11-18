# Implementation Plan: Per-weapon camo challenges
**Branch**: `feat/089-weapon-camos` | **Date**: 2026-11-18 | **Spec**: [spec.md](spec.md)
## Summary
Source-backed read-only reference per released gun, authorized CODCentral snapshot plus primary rules. Local artwork follows weapon-figure pattern. Stacked on088 commit8620c52/PR40; priorwork retained.
## Technical Context
Node22/24 static ESM, no new dependencies/backend. Catalog `src/ui/weapon-camos.json` automatically participates in src identity inventory. Build validation/HTML; tiny client handles directory filtering/failed images. No player-store access. Ignored `.local/camo-images/`, tracked fixed metadata. RawHTML5MiB; catalog2MiB/1200rows; swatches128x128,512KiB/file/128MiBtotal,4workers/20sec deadlines.36newpages;25rows/detail avoids875image directory DOM.
## Constitution Check
Pass before/after design: facts/private-state separation; unknowns retained; accessible/mobile; inert bounded assets; no public render permission inferred; no services/credentials. Research independently delegated. Requirements review before code and independent final review.
## Project Structure
Catalog/domain validator; `src/ui/weapon-camos-page.mjs`/CSS; `src/client/weapon-camos.mjs`; explicit collector/hash-checked local reader; build/nav/detail/acquisition integration; runtime and browser tests.
## Phase0 — Research
See research.md. Keep875 raw rows/order. Shared mastery is visibly shared without duplicated counters. Explain primary progression separately from ambiguous sourcelevel wording. Supplement WZ/seasonal/WarSpoils with labelled gaps. No bulk MW4.GG.
## Phase1 — Architecture and contracts
See data-model.md/contracts/reference.md. Missing/corrupt/changed/symlinked art unavailable; reader never hotlinks. Public static archives retain fallback/source links, exclude ignored art. New JSON under src avoids additional content-root identity wiring. Existing gun pages link camo detail; two Season1 guns link acquisition without fake combat stats.
## Risks and Alternatives
Reject public artwork bundling (render rights unresolved) and remote hotlinking (offline/privacy). Fixed local cache/provenance/hash reader. Capture updates explicit and reviewed, not routine build. Existing server restart needed for new route. No migration/store write. Short source objectives only, no copied guide prose.
## Verification
Catalog/roster/groups/semantics/bounds/adversarial URL/duplicates, media integrity/missing/corrupt/symlink tests. Full runtime, build/link/format/release inventory.3engine navigation/filter/noresults/source/image/fallback/noexternals/storage-preservation;320/390/768/1280/1920/200%text classic/modern dark/light axe. Record exact outcomes/limits in acceptance; independent analysis/convergence resolves blockers.
