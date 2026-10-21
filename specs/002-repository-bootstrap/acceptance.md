# Bootstrap acceptance evidence

## Local evidence, 2026-10-21
- Python 3.12.14 on Linux: `python3 scripts/check.py` passed with zero failures.
- `python3 -m unittest discover -s tests -v`: 15 positive and negative tests passed.
- `python3 scripts/doctor.py`: passed with official specify 1.2.2, integration status OK, no modified/missing vendor files, active feature 002.
- Official `create-new-feature.sh`, `setup-tasks.sh`, checklist template resolution and `check-prerequisites.sh` executed successfully. All six Bash scripts passed `bash -n`.
- `git diff --check` passed. Sensitive/local state ignore patterns verified.
- Independent fresh-copy test on Linux with a path containing spaces and no active pointer: checks, all 15 tests, selector, official prerequisites and doctor passed.
- Product plan 001 retained. No private screenshot or profile assets included.

## Protocol evidence
Initial scaffold was manual, not a completed official lifecycle. The remaining work re-entered installed protocols: tasks were regenerated using setup-tasks/template with stories/phases/dependencies; checklist generation used the resolved official template; independent read-only analyze reported full coverage and no actionable findings; independent reviewer marked six requirements-quality criteria satisfied; implement then verified T003–T008 and updated only task markers. No extension hooks exist.

This is in-session adherence to installed instructions, not a separate Codex CLI skill invocation. The CLI executable is present, but its login, model service, workflow runner execution and semantic agent dispatch were not tested. Constitution remains the proposed product baseline; no ratification is invented.

## Hosted evidence and release gate
[PR workflow run 39586013216](https://github.com/woodkill00/dmz_guide/actions/runs/39586013216) passed at head `be564c663e1d69de4aec7ee8820340d31fd51e4f` on 2026-10-21. Both `repository-checks (ubuntu-latest)` and `repository-checks (windows-latest)` passed structural/provenance checks, all 15 tests and official Bash smoke steps. Push run 39586006735 also passed. Independent reviewer verified the remote 96-file tree matches the reviewed sanitized tree.

Independent code/docs approval was recorded for that head. A final evidence-only commit must receive its own successful CI and diff review before merge. To avoid self-referential evidence commits, the final exact head, checks and merge result are recorded in [PR #1](https://github.com/woodkill00/dmz_guide/pull/1), not by repeatedly changing these source files.

Initial convergence found one partial evidence gap F1 (pending-results wording), appended T011, and implement completed that evidence task. Final convergence assesses the resulting deliverable; see review.md. Merge is an external release gate, not evidence that the game application exists.

No native PowerShell workflow is installed or claimed tested. Game application/browser journeys are not implemented and are outside this bootstrap.
