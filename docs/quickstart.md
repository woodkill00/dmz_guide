# Developer quickstart

## What you can run today

Repository validation and Spec Kit workflows. There is no application dev server, package-manager install step or website build yet. Do not invent an `npm run dev` command; the first implementation feature will document its actual runtime.

You need Git, Python 3.11+, [uv](https://docs.astral.sh/uv/getting-started/installation/), and a configured Codex coding agent to use the installed agent skills. Install prerequisites from their official sources. Repository checks use Python's standard library; using agent skills can require your own agent authentication and service access.

## macOS/Linux: Bash terminal

```bash
git clone https://github.com/woodkill00/dmz_guide.git
cd dmz_guide
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@74be0a63e93c7087c5b06556b7561810d8f78a45
specify version
specify integration status
python3 scripts/select-feature.py 002-repository-bootstrap
python3 scripts/doctor.py
python3 scripts/check.py
python3 -m unittest discover -s tests -v
```

If `specify` is not found after installation, follow uv's tool PATH setup instructions and open a new terminal. Read any failure before proceeding; don't force-reinitialize the project to hide it.

## Windows: Git Bash plus Python

This checkout is initialized with **Bash (`sh`) scripts**, not PowerShell scripts. Use [Git for Windows](https://gitforwindows.org/)' Git Bash for the Spec Kit shell workflow. A Python-only check can also run in PowerShell; that does not make the generated Bash workflow PowerShell-native.

In Git Bash, run:

```bash
git clone https://github.com/woodkill00/dmz_guide.git
cd dmz_guide
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@74be0a63e93c7087c5b06556b7561810d8f78a45
specify version
specify integration status
python scripts/select-feature.py 002-repository-bootstrap
python scripts/doctor.py
python scripts/check.py
python -m unittest discover -s tests -v
```

Confirm `python --version` is 3.11 or newer. If your installation exposes only `py`, use `py -3` for these Python commands. Native Windows execution must be verified on a Windows machine; shell instructions alone are not evidence that it was tested.

Do not run `specify init --here` on a normal clone: the integration is already committed. Maintainers changing shell variants should do so as a reviewed tooling change, not overwrite shared generated scripts locally and accidentally commit the result.

## Open Codex in the repository

Use the [first-feature tutorial](tutorials/first-feature.md). Type `$speckit-*` invocations in **Codex chat**, not Bash/PowerShell. If skills are missing, confirm the working directory, inspect `.agents/skills`, run `specify integration status`, and refresh the agent session. Review the maintainer upgrade process before regenerating anything.

The active-feature pointer is machine-local and intentionally untracked. `scripts/select-feature.py` selects an existing feature; it is not a feature creator. `.specify/feature.json` and `SPECIFY_FEATURE_DIRECTORY` determine active context, not the checked-out branch. Each parallel feature needs an isolated checkout/worktree and explicit context.

A passing repository check confirms only the checks it implements. It does not validate future app functionality, game data, rights, or a release. Capture actual commands and outcomes in your change evidence.
