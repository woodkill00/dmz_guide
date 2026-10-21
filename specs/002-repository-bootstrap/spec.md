# 002: Repository bootstrap

Status: implementation under review. This feature prepares the development repository, not the game guide application.

## User stories
1. A contributor clones the repository and can inspect, select and run the official pinned Spec Kit development workflow.
2. A reviewer can trace a small change to its requirements and evidence without trusting generated completion claims.
3. A maintainer can detect upstream drift, broken repository links and malformed project metadata on Linux and Windows.

## Requirements
- BOOT-001: Install official Codex integration from immutable Spec Kit v1.2.2 source; preserve all ten core skills, shared templates, scripts and workflow with provenance.
- BOOT-002: Preserve the approved 001 product planning artifacts, use a distinct bootstrap feature and a safe per-checkout feature selector.
- BOOT-003: Document installation, doctor, full development lifecycle, all change categories, upgrade/recovery, optional capabilities and truthful scope.
- BOOT-004: Offline positive and negative tests and read-only Linux/Windows CI validate repository contracts and upstream files.
- BOOT-005: Publish only original/appropriately licensed material with upstream notice, independent review and verified CI. No player screenshots, user secrets, deployment or setting changes.

## Acceptance
A fresh clone passes `python3 scripts/check.py` and `python3 -m unittest discover -s tests -v`. The selector creates the ignored active pointer, prerequisite scripts resolve the selected feature, and modification of a pinned upstream skill fails validation. CI verifies the exact PR head before merge. No application functionality is claimed.

## Non-goals
S1–S8 application implementation, hosting, accounts, Discord integration, authentication credentials, repository security settings, scraped game assets and automated issue publication.
