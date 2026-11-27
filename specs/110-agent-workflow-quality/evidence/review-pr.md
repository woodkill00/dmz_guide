# Review and PR helper pilot receipt

Independent workflow-review actor discovered dmz-review and dmz-pr from docs/agents/workflows.md, then consumed their installed SKILL.md instructions by direct-path fallback. This proves scoped repository navigation and instructed execution, not automatic chat UI/catalog invocation. Actor was given raw review request, fixed base, candidate, standards and specification; expected oracle answers were not supplied.

Fictional fixture root: <OS-TEMP>/mw4-agent-pilot-AVEfGG/review. Reviewer-owned outputs: reviewer-check.mjs, findings.md, pr-body.md. Production tooling feature 110; T012, FR-001/FR-005/FR-008. Context branch feature/110-agent-workflow-quality, HEAD 201f039833a54ac6ff3630a72e889680cca4df40. Windows PowerShell; Node v24.15.0.

Fixed base SHA256 fa5487fcbb7b423e761b02b20c110195997c2a133a33e3b58045df47ce718b03; candidate SHA256 03bc3c61cfd0546794b06824247216a58aa4c03ecc54d8a5705f3aaa03d79737. Exact local commands from fixture review directory: `node reviewer-check.mjs base` (exit 0, escaping/numeric/unknown pass) and `node reviewer-check.mjs candidate` (exit 1, all three fail). Check imports each module and independently checks escaped label text, numeric quantity and Unknown for null quantity.

Separate standards finding S1 HIGH at candidate/card.mjs:1: unescaped user label enters HTML. Separate specification finding R1 HIGH at candidate/card.mjs:1: numeric and unknown quantities disappear. Generated a local PR-body draft preserving all repository template sections with honest red evidence, exact fixture hash, rollback, privacy and independent review. Candidate untouched; no repair, publication, commit, external write, game facts or private state. Runtime string check is not a browser exploit test. Fresh reviewer used its own decision; no self-approved implementer checklist.

Limitations: real UI/catalog invocation unavailable in this actor; no product test suites or browser exploit run. At the original review point the intentionally defective candidate remained failing pending implementer repair and re-review. This is passing behavioral evidence for independent detection/reporting and local PR drafting, not passing acceptance for the defective candidate. Full local reports remain disposable; no private fixture paths or source payloads retained here.

## Independent repair re-review and continuity

Integration owner repaired only the disposable candidate. Reviewer reran unchanged `node reviewer-check.mjs candidate` on 2026-11-27, Node v24.15.0/Windows: exit 0; escaping, numeric and Unknown quantity all PASS. Repaired candidate SHA256 fa5487fcbb7b423e761b02b20c110195997c2a133a33e3b58045df47ce718b03 matches fixed base. S1/R1 fixture findings are resolved. Original red evidence is retained above. Reviewer did not edit candidate or oracle; no production defect or production repair is implied.

Fresh handoff resumer noticed the private before-repair findings/PR draft still described the original candidate. Reviewer labeled both explicitly historical and added separate final-pr-body.md with current repaired hash and green evidence, preserving original red reports. This is successful stale-context detection/review continuity evidence, not a new product defect. Tooling implementation validation and final independent acceptance remain separate.
