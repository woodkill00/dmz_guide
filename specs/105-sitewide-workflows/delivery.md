# Delivery and evidence ledger

2026-11-22 · feature105 · feat/105-sitewide-workflows. Local implementation; no remote publication or main merge.

| Requirement | New delivery and retained owner | Executed evidence |
|---|---|---|
| FR01 Home/start/resume | Dashboard task launchpad; existing live summaries retained; Workspace recent/pins | site-workflows runtime; sitewide browser navigation |
| FR02 Navigation | Shared bounded Workspace disclosure across guide/maps/editors; registry links, Help/Quality and existing data-review registration | sitewide all3 engines; editor all3; exact registry fixtures |
| FR03 Search | Debounce, clear, query/type/page URL history, Previous/Next100; acquisition-only weapon references | sitewide all3 history/Cronen tests; runtime unified indexes |
| FR04 Recovery | Explicit validated current/prior guide+armory snapshot preview/export; optional quality bundle module; owner restores retained | sitewide all3 downloaded bundles/7b/prior/omissions; runtime workspace-manifest/site-workflows |
| FR05 Progress | Post-commit metadata receipts and advisory cross-tab notices; existing player CAS retained | all3 real guide/armory saves, quota/no receipt, unsaved draft protection; runtime owner stores |
| FR06 Design | Compact/comfortable shared preference; bounded panels, filters, sticky/scroll-safe audit table | all3 mobile/light/200% layout; screenshots inspected |
| FR07 Accessibility | Native disclosures, Escape/focus return, labels and status text; map skip links now in named navigation landmark | sitewide all3; editor media axe all3; Safe Run axe all3; Loot Run Chromium axe |
| FR08 Quality | Guarded public audit, exact reader/editor targets, canonical record/context/source bindings, paged review/import/export | site-quality runtime; main/adverse all3 corruption/quota/stale-file/pending-import/two-tab CAS |
| FR09 Editing | Contextual help and shared navigation on editor/previews; finite static asset allowlist; retained sections/photos/history/recovery | page-editor-run all3 Orders/media/adverse/all adapters; runtime author preview/integration |
| FR10 Maps/routes | Four shortcuts; retained marker/panel/waypoint, safe and mixed-loot owners | field-workflow all3; safe-run all3; loot-run Chromium; item-workspace Chromium |
| FR11 Updates | Help/source-owner links; existing source impact/conflict decisions retained, no automatic application | sourced-catalog Chromium; runtime source impact/change/guard tests |
| FR12 Performance |100-row bounded search/audit rendering and120ms search debounce; repeatable local measurements | npm run test:sitewide;105-performance.json (ignored machine-local measurements) |
| FR13 Release tests | New npm test:sitewide; retained editor/maps/needed/source regressions; complete runtime/build/check evidence | terminal results below; no historical results substituted |
| FR14 Help |14 searchable topics and links; user documentation and bounded saved disclosure preference | sitewide all3; site-workflows runtime; docs/sitewide-workflows.md |

## Repair cycle

Independent findings SITEFLOW01/02 fixed before implementation: canonical review bindings and exact metadata bounds. Implementation findings03–06 fixed: corrupt payloads refused, editorial saves use atomic IndexedDB revisions, pending import admission frozen and present undefined distinguished from absence. Stale File.text failures are epoch-guarded. Reviewer owns review.md.

Retained-suite repairs: exact dynamic servicePath expectations replace outdated absolute ports in editor and Safe Run assertions; editor error diagnostics no longer mask an original failure with missing-node timeouts. Needed-count regression waits for the explicit asynchronous Refresh's expected result before asserting unchanged numeric expectations. Map skip-link landmark issue was repaired without excluding axe rules.

## Current receipts

Ignored files in test-results/ contain the local run outputs. Final terminal counts and review decision are appended after all running checks finish. The table records targeted retained coverage, not a claim that every historical browser suite ran or that public content is complete/verified game data.

## Current executed receipts

- `npm run test:sitewide`: PASS, Chromium/Firefox/WebKit main and adverse editorial journeys (`105-final-sitewide.log`). Local measured search66/92/71ms and selected Chromium route readiness205–869ms; machine/run measurements only.
- `node tests/browser/page-editor-run.mjs`: final rerun PASS in all three engines for Orders edit, section/media/recovery, adverse saves and all adapter types after removal of duplicate navigation tags.
- Map browser suites: field workflow all3; Safe Run all3 including five axe layouts each; Loot Run Chromium axe, persistence and owner isolation.
- `npm --prefix tools/hajin-map test`:244/244 PASS, no skipped tests.
- Retained source-catalog journeys and disposable weapon-manager reviewed apply/rollback: Chromium PASS. Acquisition counter/quota/CAS/corruption/storage-denial, Dashboard, item workspace and Needed count journeys: Chromium PASS.
- `node scripts/build.mjs`:2111 routes plus404; `node scripts/build-unified-map.mjs`:8 entries built; registry capture92 identities.
- `npm run format:check`: PASS; `py -3 scripts/check.py`:0 failures. Topology has no failed routes; optional weapon update manager unavailable in that live scan because the opt-in service was not running. Its disposable browser test passed separately.
- Visual inspection:390px quality filters and200% Help/Workspace remain inside viewport with bounded scroll. Quality screenshot's red error intentionally demonstrates malformed-import rejection, not missing player progress.
- Local4173 status reports guide/maps ready; Home, Help, Quality, recovery and four canonical map routes return200.

Final release runtime: `npm test` PASS1159/1159,0 failures,0 skipped (`105-final-runtime.log`), including exact-one-module saved preview. Earlier failed interim receipts were repaired and superseded, not counted as passing evidence. Final independent acceptance is recorded by the reviewer in review.md.
