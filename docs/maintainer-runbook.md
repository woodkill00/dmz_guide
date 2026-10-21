# Maintainer runbook

## Ownership

Assign actual people before relying on a role. These are responsibilities, not claims that a team exists:

- Repository owner: scope, license, publishing authority and settings.
- Integration maintainer: shared contracts, tool pin, CI and merges.
- Feature implementer: bounded changes and reproducible evidence.
- Independent reviewer: requirements-quality gates and acceptance review.
- Content/domain reviewer: sources, build applicability and coverage.
- Rights/security reviewer: asset permissions, import boundaries and sensitive findings.

One person may cover several roles, but an implementer must not misrepresent self-review as independent approval. If review capacity is missing, disclose that blocker rather than fill in a fictional reviewer.

## Before merging

Check clean scope and active feature, artifact consistency, reviewer-owned checklist decisions, exact local/CI results, provenance and privacy, documentation/changelog, and rollback. Inspect workflow permissions and third-party dependencies. Confirm CI really ran on the intended commit; a badge or local pass is not remote evidence. Repository CI is not a branch-protection rule, and this bootstrap does not claim server-side protections are enabled.

## Baseline checks and dry run

In a disposable clone/worktree, install the pinned CLI as described in quickstart, select bootstrap 002 and run:

```bash
specify version
specify integration status
python3 scripts/doctor.py
python3 scripts/check.py
python3 -m unittest discover -s tests -v
git diff --check
git status --short
```

On Windows use the Python launcher appropriate to your installation and Git Bash for shell scripts. Capture OS, Python/CLI version, source commit, command output and limitations. A doctor report describes environment readiness, not app correctness.

Do not use a real production profile or private user screenshots in the dry run. Exercise validators against synthetic bad inputs as well as passing fixtures. Never mark agent skills as executed because their files exist. Read the owning bootstrap evidence for what was actually tested.

## Upgrade Spec Kit safely

1. Open a scoped tooling change. Read official release notes and compare the candidate against v1.2.2; identify CLI flags, templates, skills, scripts and workflow semantics that change.
2. Resolve the release to an immutable commit and record it. Keep the current pin and clean known-good checkout for rollback. Do not update directly on the release branch.
3. Install the candidate in an isolated environment/checkout. Inspect `--help`, then regenerate only in a disposable copy using the intended integration and shell. Never blindly force-overwrite the real repository.
4. Diff generated files, constitution/templates, ignored machine state, licenses and custom scripts. Preserve deliberate project customizations. Optional extensions/bundles need their own version/source review; the core pin does not pin them by implication.
5. Run repository checks, negative fixtures, integration status and a synthetic feature workflow rehearsal. Validate any runner definition as loaded, inspect human gates, and test status/resume only against a safe disposable run. Confirm no unexpected remote writes or credentials are introduced.
6. Update `speckit.lock.json`, provenance/hash records, retained notices and user docs together. Obtain independent review and record exact results. Windows claims need actual Windows evidence.
7. Merge only when the expected generated diff and evidence agree. Keep the previous immutable pin in version history.

## Rollback

Before merge, abandon the candidate worktree and retain the known-good checkout. After a shared merge, make a reviewed revert commit rather than rewriting shared history; reinstall the prior immutable CLI version and restore the matching generated files and lock together. Rerun checks and integration status. Do not discard uncommitted user work.

An app/content rollback needs a separate release-specific plan covering schema compatibility, local-state recovery and data retention. Repository rollback alone does not restore player data or revoke leaked credentials. No deployed service exists yet, so no production rollback command is claimed.

## Release readiness

A future release needs approved scope/build, verified content coverage, rights/credits, privacy and recovery behavior, measured acceptance/security/accessibility/mobile/performance evidence, operational ownership, and a deployment decision. A tagged repository bootstrap is not a finished app. Record known limitations and migrations; do not promise zero bugs or perfect completeness.
