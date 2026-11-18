# Feature Specification: Per-weapon camo challenges
**Feature Branch**: `feat/089-weapon-camos` | **Created**: 2026-11-18 | **Status**: Implemented and verified locally
**Input**: Research all weapon camo challenges, requirements and unlock order, and pictures, then add them to each weapon.

## User Scenarios & Testing
### User Story 1 — Find a weapon's challenges (Priority: P1)
From Weapons or a gun, open its camo page. Browse Military, Special, Completionist, Prestige and mode mastery with readable requirements, order and pictures.
**Independent test**: all35 released identities have a reachable page;25 captured core entries match the snapshot without inventing combat data for Season1.
### User Story 2 — Understand prerequisites (Priority: P1)
See individual weapon-level gates, earlier camos and cross-weapon requirements; distinguish shared mastery.
**Independent test**: Specials aren't gated behind all Military; official33 thresholds don't become35/37. Conflicting provider labels stay disclosed.
### User Story 3 — View pictures safely (Priority: P2)
Local swatches accompany requirements; missing artwork has a labelled fallback and source link. Ordinary image links allow enlargement.
**Independent test**: each core row has an exact registered source image; explicit local collection verifies bytes/dimensions; ordinary reading never fetches providers.

## Requirements
- **FR-001** Dated camo directory and individual page for all35 released acquisition-roster guns. Link from Weapons, acquisition rows and existing gun pages. Categorized/searchable directory and native links; no invented Season1 combat records.
- **FR-002** Capture875 COD Central core rows (25/gun) with stable IDs, names, source order/group, exact short objective, direct challenge URL and image mapping. Validate snapshot coverage, uniqueness, roster alignment, groups, bounds and URLs. Completeness means this named snapshot, not all future/event/store camos.
- **FR-003** Explain official order separately from provider wording: Military weapon levels; individual Special level gates; Gold eightMilitary+threeSpecials; Platinum classGold; HarmonicBreak33Platinum; Divergence33HarmonicBreak. Prestige1/max/Master150/250 conditions remain separate from provider Terminus numeric observations. Never infer level arithmetic from “more unlocks.”
- **FR-004** Default reference is DMZ; label MP mastery/shared scope. Platinum/Harmonic progress may combine MP/DMZ. Repeated Divergence/mastery rows aren't35 separate progression goals. Include sourced WZ/seasonal/WarSpoils references with explicit missing-art/criteria limits, not claims of complete-game coverage.
- **FR-005** Explicit fixed-allowlist image collection into ignored cache with SHA256/MIME/dimensions/provenance. No provider-script execution, arbitrary URLs, credentials, remote runtime requests or public art bundling. Contained/symlink-safe paths, bounded streamed bytes/timeouts/dimensions; reader serves exact hash-checked registered files or fallback.
- **FR-006** Compact grouped rows, readable text, lazy thumbnails, source/date/status and directory link. Keyboard/dark/light/reduced-motion/320px/200%text without overflow. Meaningful image alternatives and independent disclosures; no hover-only content or failed-image layout jump.
- **FR-007** Private manual/blueprint/build/inventory/mission state is neither interpreted as camo ownership nor modified. Read-only reference, no new progress store. Published prerequisites don't imply user ownership.
- **FR-008** Build/test/start never fetch providers. Data participates in source identity/output inventory. Updates require explicit recapture, diff/review/revalidation; no silent replacement. Preserve stacked087/088 work.

## Key Entities
Snapshot, released weapon, camo row, official progression rule, source report, local image registry, supplemental seasonal reference. Private progression unchanged.

## Success Criteria
- **SC-001** All35 guns expose25 source rows without duplicate camo IDs or broken internal links.
- **SC-002** Every core row has a verified local swatch mapping or explicit unavailable state; no normal external artwork request.
- **SC-003** Rules/conflicts independently reviewed; no unresolved semantic blocker.
- **SC-004** Chromium/Firefox/WebKit, responsive/200%text/classic/modern/dark/light accessibility, generated-route, release-inventory, runtime and formatting checks pass with exact evidence.

## Assumptions and Clarification decisions
DMZ is primary. “All” is bounded to dated released-roster/source coverage; unseen future/event camos cannot be invented. CODCentral describes pictures as renders, not proven in-game captures. Existing authorization covers local collection; screenshot redistribution permission isn't stretched to renders. No user clarification or private migration needed. This request adds reference lists; existing acquisition tracking stays linked, with no new camo ownership counters.
