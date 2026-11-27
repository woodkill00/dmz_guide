# Forward pilots receipt

Independent actor, 2026-11-27, Windows PowerShell / Node v24.15.0 / existing Playwright Chromium headless. Fictional bundle `${TEMP}/mw4-agent-pilot-AVEfGG`; no real game facts, player storage, account access, external writes, Git commit or publication. Owning feature resolved from `.specify/feature.json` to `specs/110-agent-workflow-quality`, branch `feature/110-agent-workflow-quality`, observed HEAD `201f039833a54ac6ff3630a72e889680cca4df40`. Artifact analysis/checklist were independently accepted before these exercises; this receipt does not approve implementation.

## Discovery and actual helper use

Started with checkout `AGENTS.md`, without supplied helper names. Followed its agent workflow guide, then workflow bridge, repository map, domain/testing docs; `npm run skills:list` exit0 listed twelve valid helpers. Read selected `.agents/skills/dmz-*/SKILL.md` directly and applied their instructions. Actually used: **diagnose, test-first, design** for bug; **prototype, architecture** for UI; **research, domain** for content; **handoff, write-agents, retro** for continuity. Read upstream references only as provenance; did not execute vendored originals. The actor's supplied runtime skill catalog lacked dmz entries; file discovery/direct-path execution succeeded, automatic UI/catalog discovery is unverified. `npm run skills:check` exit0 is installation integrity, not behavioral acceptance. Review/PR helpers belong to a separate actor.

## Commands and observed results

Run below from `${TEMP}/mw4-agent-pilot-AVEfGG` (logs retain actual output):

| Command | Original | Final | Evidence |
| --- | --- | --- | --- |
| `node bug/check.mjs` | exit1, missing(8 required,3 owned) returned0 expected5 | exit0, `Fictional missing-stock behavior PASS` | bug/before.log, after.log |
| `node ui/check.mjs` | exit1, host220px/scroll376px at16px | exit0, `Fictional card layout and interaction PASS` | ui/before.log, after.log |
| `node content/check.mjs` | exit1, count2 expected3 | exit0, `Fictional source-backed content PASS` | content/before.log, after.log |
| `node ui/observe.mjs` | supplemental measurement of frozen original and proposed/final | exit0, computed-font/layout/wrapping/keyboard assertions pass | ui/measurements.log |
| `node ui/observe.mjs` after scoped ui/AGENTS.md creation | realistic instruction exercise | exit0, same evidence recorded | ui/instruction-verification.log |
| `node ui/check.mjs` after owner's separate oracle hardening | fixture lifecycle correction | exit0 | ui/hardened-after.log |

No oracle was edited by this actor. `Get-FileHash bug/check.mjs,ui/check.mjs,content/check.mjs` before/after initial repairs and `Compare-Object` gave no differences. Integration owner subsequently replaced only the UI oracle with a computed-body-font guard; its rerun above is recorded separately from original red/green evidence.

Bug: reversed subtraction in public missing() only. Existing independent oracle reused for red/green rather than changing expectations. `rg -n 'missing\(' bug` identified only check.mjs as exercise caller. Short interface assessment preserves explicit required/owned roles and public boundary; no wrapper/state store added. Invalid/unknown numeric inputs have no supplied contract, not silently defined. See bug/assessment.md and original.inventory.mjs.

UI: original card min-width350 + padding/border produced376 inside220. Disposable self-contained proposed.html selected card-owned border-box width100%, min-width0, wrapping and relative text over enlarging host or introducing framework/state abstractions. Original fixed16px body stayed16 when root doubled; supplemental measured evidence exposed that oracle coverage gap. Proposed/final measured card/host/scroll220 at both sizes, actual body16/32 and heading24/48, title wraps, named + button keyboard Enter increments to1; original/final oracle also checks click. Viewed generated fictional enlarged-text screenshot. See ui/architecture.md, observe.mjs and measurements.log. No server/CDN/storage needed; proposed.html remains locally viewable. Production owner pointers came from repository map; no production refactor performed.

Content: local supplied primary source content/source.md revision training-1,2026-11-27 supports three Training Relays; count/objective corrected together, rarity null and source retained. Research cites exact source/applicability and unsupported mechanics; domain-only content/GLOSSARY.md defines mission, fictional identity, objective quantity, unknown rarity and applicability without implementation paths. No external research needed for this fictional source. See content/research.md and original.mission.json.

## Continuity, improvement and limits

Sanitized OS-temp `handoff.md` points to branch/head, selected feature/artifacts, exact tests, generated/uncommitted state, no service/CI IDs available, rollback snapshots and pending independent review/resume. `retrospective.md` ties the computed-font coverage gap to measured evidence, recommends deterministic oracle protection and distinguishes the owner's actual hardening from this actor's scoped instruction improvement. New ui/AGENTS.md concisely requires computed text-size evidence and links existing scripts; rerun exercises it, with no claim of independent future-compliance proof. Local instruction links resolve; helper names/metadata were unchanged.

Actor edited only fictional bug/ui/content files and generated notes in OS temp, plus this sanitized receipt. Review fixture and reviewer-owned gates untouched. Other actor will independently review/resume; no self-approval. No production app/browser suites or CI run by this actor; Windows fixture paths contain no spaces, so this is not evidence for paths-with-spaces or Linux. Fresh UI/catalog discovery, physical-device accessibility and live-game validity remain unverified. Direct-path behavior evidence is meaningful but bounded to these three fictional exercises.
