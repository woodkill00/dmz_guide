# Requirements review checklist

Reviewer-owned quality gate. These boxes are deliberately unchecked during planning; implementation task completion does not approve them.

- [x] Every story is independently testable and has an observable outcome.
- [x] Editorial status, player completion, source verification and content presence remain distinct in wording and data contracts.
- [x] The initial 24 Orders slots are scoped to the existing Hajin model; Story Missions, chapter variants and X01 additions have no invented denominator.
- [x] Every audit state transition, note, export and restore has a bounded validation and recovery rule.
- [x] Spoiler notes remain private, and public/search projections are reviewed for disclosure.
- [x] Cross-origin backup and map handoff claims match what browser security allows; omitted modules are reported.
- [x] Each functional requirement maps to a task and an executable acceptance scenario.
- [x] External content sources have attribution, applicability and rights review before ingestion.
- [x] Release claims distinguish automated checks from actual gameplay and source verification.


## Independent assessment - 2026-11-14

Scope: branch commit `d28cbfc` and the reviewed working-tree run-plan restore-link correction and feature080 source-rights register entry. This records the criteria assessed; it is not PR approval, merge authority, public publication permission, gameplay verification or formal accessibility certification. The implementer must bind final release checks to the final candidate.

Evidence supporting checked criteria:

- Stories and traceability: the seven stories have explicit independent tests and observable acceptance scenarios. FR-001 through FR-018 map to T001-T023 and named domain/browser scenarios in `spec.md`, `tasks.md` and `acceptance.md`. Task checkmarks alone were not used as proof.
- Data meaning and scope: inspected the audit, progression, match, health and source models. Independently counted 182 objectives: 66 reported Orders and six protected Story Missions, with 21 fixed-page records on pages 1, 4, 7, 10, 11, 14 and 15. The remaining 17 slots are unassigned rosters, not 17 missing mission identities. Source IDs resolve; duplicate Healer/No Time variants were spot-checked against distinct provider detail pages. This is not an independent verification of all 66 gameplay claims.
- Audit safety: inspected the 2,000,000-byte, 10,000-entry, 1,000-history-event and bounded-text validation. Independently reproduced and rechecked dirty-filter retention, cross-tab compare/write ownership, protected-note clearing, cited-source fingerprint changes, pending-write control freezing, restore/Undo invalidation and dirty-Undo confirmation. Cancel preserves the exact saved bytes and draft; confirmed Undo appends its reverse history event. The focused mission-audit domain suite passed 10/10. Earlier combined audit/coverage/relations/match/health/manifest checks passed 21/21.
- Privacy: private notes/reviewer fields are cleared and the protected editor is hidden with spoilers disabled. Audit exports explicitly warn that they retain private spoiler notes. The public relation/search/build paths inspected do not ingest local audit notes; source facts and private editorial state remain separate.
- Backup/handoff: inspected explicit selected-file bundling, SHA-256/type/size checks, named omissions and separate owner restorers; no automatic cross-origin storage read or atomic restore is promised. Map messaging binds the expected origin, window and nonce and offers file fallback. The corrected named-plan restorer is `/run-plan/`; focused manifest tests passed 2/2. Unsupported/omitted modules and download-request wording remain explicit.
- Release wording: `acceptance.md` preserves historical versus later content counts, the Windows access-violation failures, focused repair evidence, pending fresh CI and independent/manual boundaries. Those unavailable or historical checks were not converted into current passing evidence. Representative full-browser/visual release gates still require the maintainer's final assessment.

Initial documentary gap:

- **External-source rights review was initially left unchecked.** Attribution, source dates, unknown build applicability, original short factual summaries and earlier owner-authorized local collection are documented. However, `docs/licensing-and-assets.md` requires a source-specific dataset acceptance/rights record and explicitly separates local permission from public redistribution. No feature080 Orders/Story dataset entry or equivalent permitted-use/reviewer receipt was found. Record the admission scope, source/creator attribution, permission basis, modifications and reviewer/date, retaining any public-distribution restriction; do not infer a public grant from collection permission. This is an evidence gap, not a finding that infringement occurred or that unused artwork needs a license.


Rights documentation recheck, same date: the new feature080 entry in `docs/licensing-and-assets.md` now records the earlier owner-authorized collection, exact named source families and linked record-level references, local factual purpose, transformations, exclusions and the absence of a grant for provider expression/artwork. Independent catalog inspection found no artwork references in the 72 mission records; the longest admitted objective label is 75 characters, and disputed step lists remain empty. Together with the source comparison, attribution/build metadata and earlier permission, this substantiates the rights-review criterion for the explicitly local factual admission scope. The reviewer does not infer an MIT grant, publisher permission, full-provider-data accuracy or public-redistribution clearance. Any broader publication remains a separate maintainer decision under the asset policy.

All nine named checklist criteria are now assessed within that scope. Fresh CI on the final candidate, representative human visual review and any separate public-publication decision remain release work; a checked criterion is not approval of the PR or a substitute for those gates.
