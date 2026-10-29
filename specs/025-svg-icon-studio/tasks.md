# Tasks: SVG icon studio

## Phase1 Definition/foundation
- [x] T001 Resolve scope and constitution/clarify; plan/research/model/contracts/checklist and dependency analysis in specs/025-svg-icon-studio. FR001–006/SC003.
- [x] T002 Add pure hostile/boundary/determinism and backward-compatible recipe backup fixtures in tools/hajin-map/tests/icon-design.test.ts. FR004/005/SC002. Run before implementation.
- [x] T003 Implement strict fixed-field recipe validation, original templates/primitives and safe SVG in src/workspace/icon-design.ts; optional IconAsset.design in model.ts/icons.ts/backup.ts. Paths relative tools/hajin-map. FR001/004/005/SC002. DependsT002.

## Phase2 US1 create/use
- [x] T004 Build responsive labeled live-preview editor in src/workspace/icon-studio.ts and src/style.css; abortable generatedPNG staging via icons.ts, app.ts integration with save/dirty/transaction locks and duplicate notices. FR001/002/003/006. DependsT003.

## Phase3 US2 edit/export
- [x] T005 Add library Edit a copy and safe SVG/PNG downloads with preserved recipe/backup/category/point semantics in app.ts/icon-studio.ts. FR003/004/005/006. DependsT004.

## Phase4 Acceptance
- [x] T006 Add offline browser regression scripts/icon-studio.browser.cjs and wire scripts/test-workspace.cjs. Create/assign/reload/copy/dedup/backup/export/invalid/cancel/dirty guards/mobile keyboard. Run full map unit/build/browser and repository checks. FR001–006/SC001/002. DependsT005.
- [x] T007 Independent security/data/UI implementation review; analyze/converge append repairs if needed, rerun owning tests, record acceptance and user docs in docs/local-map-workspace.md. SC003. DependsT006.

## Dependencies and implementation strategy
Sequential T001→T002→T003→T004→T005→T006→T007; shared contract edits serialized. MVP create/save precedes variant/export. No parallel implementation; independent reviewer work only. Existing32icon/8MiB budgets unchanged; previous feature024 capture assets remain ignored. Rollback: preserve a private backup first; older validators require removing optional icons[].design from a copy before restore, keeping PNGs/IDs/references.

## Phase5 Convergence repairs
- [x] T008 Resolve ICON-UI-R1/R2: own one icon-form draft at a time, visibly disable other forms until save/cancel; prevent creator/upload draft loss. Attach a validated editable recipe to content-identical raster-only assets without replacing pixels/metadata/references. Regression tests in scripts/icon-studio.browser.cjs and tests/icon-design.test.ts; update contracts. FR003/004/006/SC001/002/003.

Final evidence: acceptance.md;91unit/58browser/build/repository/diff checks passed. Independent requirements/security/UI reviews completed, T008 repairs rechecked clean. Final convergence found no further work; no empty task phase appended.
