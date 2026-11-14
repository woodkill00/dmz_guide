# Feature Specification: Connected guide and mission audit

**Feature Branch**: `feature/080-connected-guide-mission-audit`
**Created**: 2026-11-13
**Status**: In progress; partial implementation and acceptance evidence recorded in `acceptance.md`
**Input**: Connect the guide's existing inventory, upgrades, missions, weapons, keys, maps, match tools, search, backup, and home page; add a dedicated mission and story content-audit page with section-level follow-up states.

## User Scenarios & Testing

### User Story 1 — Audit every known mission section (P1)

An editor opens `/missions/audit/`, sees the existing 24 Orders page slots and every recorded Story Mission, and can filter unrecorded pages, unchecked sections, sections needing correction, and sections set aside to fill later. Selecting a page or mission reveals its sections and exact content state. The editor can set a section to **Not checked**, **Needs correction**, **Fill later**, **Ready for review**, or **Checked**, add a bounded note, and open the matching content record or authoring entry. This is editorial work status, separate from a player's completed mission state.

**Independent Test**: With a synthetic pack containing one Order and one Story Mission, change two section states, reload, filter each state, open their exact records, export/restore the audit state, and confirm player progress and catalog facts have not changed.

**Acceptance Scenarios**:

1. Given an unrecorded Orders page, when the editor selects it, then the page can be marked Fill later without creating a fictional mission.
2. Given a recorded mission with no source for its reward, when the editor marks Rewards Checked, then the page still shows the reward evidence gap and does not publish a verified reward.
3. Given a Story Mission with spoiler content, when spoilers are hidden, then audit labels and search do not reveal its protected name, steps, or notes.
4. Given a catalog update that removes or changes an objective, when the audit loads, then the old review remains recoverable and is flagged stale rather than silently rebound.

### User Story 2 — Prepare from one goal (P1)

A player chooses one or more unfinished missions/upgrades and gets one explanation of required items, known shortages, print/craft options, relevant keys and locations, and a next action. Every step links back to its source record, inventory row, recipe, mission, and map location where recorded.

**Independent Test**: A synthetic mission and upgrade sharing an ingredient produce one shortage after stock/reserves are applied; unknown costs or locations remain labelled unknown.

### User Story 3 — Carry a plan through a match (P1)

A player starts a named match from a preparation plan, manually records found items, completed objectives and route stops, then previews a reconciliation before saving changes to inventory/progress. Cancel and failed saves retain the prior state.

**Independent Test**: Start, stage, preview, cancel, then apply a synthetic match; verify one transaction, exact counts, progress, undo/recovery path, and no automatic game-account sync.

### User Story 4 — Recover the whole local workspace (P1)

The player can export a manifest covering guide profile, map workspaces, route plans, mission editorial audit, weapon builds and other private modules; inspect omissions and source dependencies; preview an import before applying it to the intended workspace. An export receipt does not claim that the file actually saved.

**Independent Test**: Round-trip each supported module with synthetic data, reject malformed and stale imports without partial replacement, and report modules unavailable in an older backup.

### User Story 5 — Review content health and updates (P2)

An editor sees source-backed coverage and unresolved items for missions, story sections, recipes, item icons, weapons, keys and map locations. New source captures and patch notes enter a bounded change queue with old/new claims, attribution, build applicability and explicit apply/reject decisions. Contradictions remain visible.

**Independent Test**: A changed source claim creates a review item; neither the published record nor private player state changes before a reviewed apply.

### User Story 6 — Compare weapons and complete references (P2)

A player compares builds with source, game mode, patch date and DMZ-testing status. An editor can audit mission/story and item/recipe relation completeness, then use existing Content Studio flows to fill supported gaps without inventing missing facts.

**Independent Test**: Conflicting Warzone and DMZ values remain separate; missing attachment effect, mission step or recipe ingredient appears in the health queue and exact editor link.

### User Story 7 — Navigate and finish a task on any screen (P2)

Home shows the player's next actions and recent work; search and links open exact records across guide and map surfaces. Repeated navigation and save/status controls remain consistent across desktop/mobile, keyboard and touch. Release readiness reports actual content, recovery and browser evidence rather than a blanket completion claim.

**Independent Test**: Complete the same synthetic mission-to-item-to-map-to-match journey at 390px and desktop with keyboard and pointer, including failed storage and offline/unavailable companion states.

### Edge Cases

- The current official starter has three source-reported page-one Orders and six source-reported Story Mission records; the audit must show 23 unrecorded Hajin page slots and separate Story Mission sections without fabricating disputed rewards, prerequisites or current-build proof. The original 24-slot empty baseline is retained in historical test/analysis evidence.
- Orders page numbers may vary with chapter choices. Stable mission/chapter identity must survive a changed display page; ambiguous placement is flagged for review.
- Official Season 1 notes add X01 Orders. Page coverage must be scoped by game build/map/season and support later page sets rather than treating 24 as a permanent complete-game denominator.
- Editorial status, source verification, and player completion are independent dimensions. None implies another.
- Spoiler-hidden records, source removals, unavailable maps, partial requirements, duplicate names, storage quota failures, and concurrent tabs must leave recoverable state.
- Map companion, guide, and Studio run on different local origins; cross-surface transfer uses explicit validated handoff or file exchange, not implicit shared browser storage.

## Requirements

### Functional Requirements

- **FR-001**: Provide a dedicated searchable `/missions/audit/` page with a compact summary, Orders page list, Story Mission list and status filters, reachable from Missions, Home/feature navigation and Site map.
- **FR-002**: Show all 24 current Hajin Orders page slots as recorded/unrecorded using existing coverage logic; represent later X01/seasonal sets separately once their scope is evidenced.
- **FR-003**: For recorded mission/story entries, audit identity, objective steps, prerequisites, item requirements, locations/map links, rewards, walkthrough, sources/build evidence and imagery as distinct sections. Page-level roster/coverage remains a separate section for unrecorded slots.
- **FR-004**: Allow each section to be Not checked, Needs correction, Fill later, Ready for review or Checked, with bounded note, reviewer/date and a reversible status history. Preserve player progress separately.
- **FR-005**: Compute presence/evidence warnings from catalog facts independently of editorial status; a Checked section with missing/disputed evidence still shows the warning.
- **FR-006**: Preserve audit state by stable pack, mission/chapter and section identity across reloads; flag stale/rebound/missing records after content updates and require explicit review before relinking.
- **FR-007**: Keep editorial audit state local and exportable, with validated preview-before-restore; never publish it as game content automatically.
- **FR-008**: Provide exact links to the mission detail and authoring page for recorded entries; unrecorded slots offer a blank authoring entry without invented mission data.
- **FR-009**: Enforce spoiler-safe projection in the audit list, notes preview, filters and shared search. Private audit exports retain the owner's full notes for restoration, warn that they may contain spoilers, and never enter public/generated search or content automatically.
- **FR-010**: Add a single next-action/preparation projection from selected unfinished missions/upgrades using existing stock, reserves, crafting, printing and partial-data semantics.
- **FR-011**: Add bidirectional links among item, recipe, upgrade, mission, key, weapon and map records only where a recorded relation exists.
- **FR-012**: Add an explicit match lifecycle that previews and atomically applies manually reported inventory/progress changes, with rollback/recovery evidence.
- **FR-013**: Provide an overall local-backup manifest and import preview for supported guide and companion modules, showing omitted dependencies and version incompatibilities.
- **FR-014**: Add a coverage/contradiction dashboard and a source-change review queue with explicit decisions and build applicability.
- **FR-015**: Audit patch-bound weapon stats and builds by source/mode; do not merge WZ values into DMZ-tested values.
- **FR-016**: Audit item/recipe/mission relationship integrity and route missing facts to exact editing surfaces.
- **FR-017**: Give Home a compact next-action/recent-work view and maintain consistent navigation, search, status and empty states across surfaces.
- **FR-018**: Add cross-page mobile, keyboard, accessibility, performance and release-readiness checks with explicit coverage and unresolved findings.

### Key Entities

- **Audit target**: Pack, scope/build, page or stable mission identity, section ID, source record binding and current evidence fingerprint.
- **Audit entry**: Target, editorial state, note, reviewer/date, revision and reversible event history; never player completion.
- **Preparation plan**: Goal IDs, ordered actions, resource projection, known/unknown gates and exact deep links.
- **Match session**: Start snapshot, staged observations, reconciliation preview, applied transaction identity and recovery reference.
- **Workspace manifest**: Module/version/size/dependencies, export omissions and restore result per module.
- **Review item**: Source claim/record version, difference, confidence/contradiction and apply/reject disposition.

## Success Criteria

- **SC-001**: All 24 currently modeled Orders page slots and all recorded Story Mission identities appear in the audit; zero missing slots are presented as completed or verified content.
- **SC-002**: From the audit list, an editor reaches and saves any listed section state in at most four actions; filters expose unchecked, correction and Fill later work without opening each mission.
- **SC-003**: Synthetic stale binding, malformed restore and failed-save tests retain the previous valid audit, profile and source content without partial writes.
- **SC-004**: A user can move from a selected mission or upgrade to one consolidated preparation view and every known linked item/location in a tested desktop and mobile journey.
- **SC-005**: Every source-derived recommendation states its input, build/mode scope, and unknowns; zero automated tests turn missing data into verified game claims.
- **SC-006**: Supported private modules round-trip through a reviewed backup/restore flow, with every omitted asset/dependency named in the manifest.

## Assumptions and boundaries

- The current 24 Orders slots are the repository's launch/Hajin coverage model, not proof of all seasons or chapter permutations.
- Source collection permission stated earlier covers the named providers, but new data still needs source attribution, build applicability and review before publication.
- Local-first operation remains the target. No account linking, live-game access, public deployment, paid service or community moderation is included in this feature without a separate approved contract.
- This specification is a planning artifact. None of its new behavior is shipped until tasks, analysis, implementation and acceptance evidence are complete.
