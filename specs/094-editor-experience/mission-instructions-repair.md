# Mission instructions repair

2026-11-19 · owner-reported Page1/Gear Up placeholder and request for collapsed per-mission objectives in Orders. Active094 follow-up FR13/US5/SC06; manual bounded Spec Kit repair, not an installed bug-extension command. Prior093/094 staged work and reviewer-owned acceptance remain intact.

Assessment: canonical Gear Up has the task “Equip a weapon, backpack, armor vest and Medkit from the FOB stash.” All87 current `dmz-order`/`dmz-story` records have nonempty steps with no placeholder/source-review step text. Static chapter renderer instead shows generic record description and “Open this mission to view its tasks”; main client directory renders names/status only. Individual mission details already render canonical tasks. No external research or new game claims are necessary.

Plan: shared escaped native `<details>` helper with a task-count summary, step list and honest future empty state; use collapsed in directory and expanded in chapters. Replace chapter placeholder paragraphs with instructions and retain clear full-guide links. All29 chapters use the same path; spoiler guard remains outside helper at both call sites. No private data, objective schema, source records or inventory/completion changes. Tests cover full canonical roster/detail text and inert unsafe prose, then real navigation, independent toggles, keyboard,320–1920px/200% text and accessibility in all3 engines. Build and inspect live reader. Reviewer independently owns analysis/final disposition.

Implemented: one shared escaped renderer displays canonical steps, collapsed in the main directory and expanded in chapter rosters, with full-guide/Edit links retained. There are81 visible roster entries across29 chapters; the other6 of87 stored Orders/story records are protected story missions whose existing workspace/detail steps remain behind spoiler controls. No source facts, pack version, inventory or completion data changed.

An affected editor regression caught WebKit optional checkpoint/history reads crossing navigation. The original failure assertions were retained. Optional reads now refuse stopped/hidden startup; beforeunload aborts them before the document security context changes and creates a fresh controller for canceled departure. The disk-error state retains a Reload action. The adverse regression verifies canceled departure can reload metadata without changing its task draft or canonical revision.

Executed local evidence (`test-results/` is ignored):

- `node --test tests/runtime/mission-objectives.test.mjs tests/runtime/mission-chapter-pages.test.mjs`:7/7 PASS; zero failures/skips/cancellations,16182.563ms (`094-mission-instructions-runtime.log`). All29 rosters, all87 detail step texts, escaping/empty/spoiler cases.
- `node tests/browser/mission-objectives.mjs`: all3 engines PASS (`094-mission-instructions-browser.log`). Every visible mission matches saved steps;81 collapsed entries, independent keyboard/click toggles,29 static routes, Hajin/X01 chapter/detail instructions,320–1920px/200%, dark/light axe. Exact isolated profile comparison verifies reading/toggling leaves inventory/progress unchanged.
- `node tests/browser/mission-chapter-links.mjs`: all3 engines PASS (`094-mission-instructions-editor-links.log`), including chapter editing/save/reload and individual mission/Edit identities. Initial WebKit failure was repaired and rerun, not filtered.
- Main and adverse editor runners: all3 engines PASS (`094-mission-instructions-editor-experience.log`, `094-mission-instructions-editor-adverse.log`), including canceled departure/fresh-read retention and prior async/save/refresh safeguards.
- `npm run build`:2108 routes plus404 PASS (`094-mission-instructions-build.log`). Format PASS and repository0 failures (`094-mission-instructions-format.log`, `094-mission-instructions-repo.log`).
- Live reader4173 and safely restarted author4174: Orders collapsed objectives→Hajin/X01 expanded instructions→Gear Up task→Edit field PASS (`094-mission-instructions-live.log`). No content/progress edits performed. Desktop/mobile screenshots inspected; live screenshots retained too.

Prior094 aggregate1099 runtime/79 Python/release receipts are historical before this amendment. No second aggregate/package/remote-CI run is claimed; this presentation/lifecycle repair uses focused runtime, affected three-engine regressions, current static build and source checks. No publication/commit/merge performed.

Independent final repair disposition is reviewer-owned in `final-review.md`; T016 records closure. Final convergence found no additional unbuilt requirement beyond this scoped objective visibility repair.
