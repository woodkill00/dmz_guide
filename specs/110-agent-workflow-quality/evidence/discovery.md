# Codex catalog discovery receipt

Publication follow-through, 2026-11-27. Canonical checkout `${CHECKOUT}` is MW4, not the legacy MW4_guide session root. No product source, global configuration, credentials or private profiles were changed.

## Executed method

Installed `codex-cli 0.128.0` supplied its actual protocol definitions through `codex app-server generate-json-schema --out test-results/110-codex-protocol`. A bounded temporary stdio client spawned that installed binary with `windowsHide: true`, initialized it, then requested `skills/list` with `cwds: [canonical checkout]` and `forceReload: true`. No extra skill roots, thread, model turn or remote publication were requested. The client shut down its owned process after the response. Raw probe/schema output remains in ignored test-results.

The first request failed because this CLI rejects the existing global `service_tier` value `priority` (its schema accepts `fast` or `flex`). The successful retry used only `-c service_tier="fast"` for that short-lived process. No configuration file was edited, and no model request was made. This was probe/client compatibility, not a helper defect.

## Actual result

The catalog returned exactly twelve `dmz-*` entries, each `enabled: true`, `scope: repo`, and located at `.agents/skills/<name>/SKILL.md`. Names match the independently validated installation; there were zero helper loading errors:

- dmz-architecture, dmz-design, dmz-diagnose, dmz-domain
- dmz-handoff, dmz-pr, dmz-prototype, dmz-research
- dmz-retro, dmz-review, dmz-test-first, dmz-write-agents

This establishes automatic repository catalog discovery without manual registration. It does not establish a refreshed IDE picker, automatic selection by a model, or every future client/version. Direct-path behavioral pilots remain separately documented. Original unavailable-catalog observations are retained as historical evidence.
