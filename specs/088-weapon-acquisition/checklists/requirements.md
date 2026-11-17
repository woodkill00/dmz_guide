# Reviewer-owned requirements quality checklist

- [x] Manual ownership, recorded extractions and blueprint names are independent; absent counts stay unknown and three is a reported goal, not an automatic game grant.
- [x] Optional metadata uses the existing armory envelope/CAS and requires old-backup compatibility, lossless export/restore and unrelated/private/archive preservation.
- [x] Pending/failed candidates, clean-return refresh and guarded draft/lifecycle behavior have explicit implementation and test owners.
- [x] Named blueprint coverage is a dated snapshot rather than an invented complete storefront or permanent LT-loadout unlock catalog.
- [x] Public data admission has exact scalar, aggregate byte, depth/node and semantic collision limits.
- [x] Acquisition-only released weapon identities have explicit valid owning-link and dashboard/workbench parity test contracts.
- [x] Planning source ledger records released-identity evidence, named-blueprint provenance, coverage and exclusions, with inaccessible content left unknown.
- [x] Independent analysis design findings are repaired across contracts/model/tasks before production implementation.

## Independent planning review — 2026-11-17

Read spec, plan, tasks, research, data-model, quickstart and contract, with bounded inspection of current armory validator/store/workbench owners. No production code edited and no factual population/runtime acceptance claimed. The user has authorized additional-provider research; this does not make unreadable content evidence.

### ACQ-01 — Medium: incomplete public-data bounds

The public snapshot caps weapon/blueprint/source arrays, coverage and IDs, but does not give exact maximum lengths for names, variants, methods, categories, titles or URLs, nor total serialized UTF8 bytes/depth/nodes/aggregate text. FR-002 says bounded and T001 owns admission; make these explicit in the data contract before implementation, including exact required/nonempty field rules, real dates, source/URL allowlist behavior and overbudget rejection tests. Do not rely on an array cap to bound arbitrarily long strings or silently truncate source names.

### ACQ-02 — Medium: final stored blueprint-key collisions

Rejecting duplicate normalized (weapon,name,variant) tuples does not prevent collisions in the proposed existing string key Name · Variant. A blueprint with base name 'A · B' and empty variant collides with name 'A', variant 'B'. Require uniqueness of the final normalized owned-name key per weapon, or define an unambiguous backward-compatible encoding that does not rewrite legacy names. T001/T002/T005/T006 need an explicit collision fixture, case/space duplicates and retained custom/archived name assertions. Otherwise two sourced checkboxes can share one saved ownership identity despite apparently distinct catalog rows.

### ACQ-03 — Medium: destinations for acquisition-only Season1 identities

The plan deliberately keeps acquisition-only released IDs out of the combat/stat database. Publishing them to the dashboard's resolved weapon identity list can make the existing /armory/<id>/ link point to an unbuilt combat detail route. Pin the focused acquisition deep-link syntax and owner validation for IDs absent from the combat roster; reuse the acquisition row/detail section rather than inventing statistics or dead routes. T007/T008 need actual navigation for both new released identities, plus workbench archive preservation and return/dashboard parity. Source-backed identity admission alone is not proof that the older combat page exists.

## Source gate and other assessment

The proposed 35-release roster and named blueprint methods remain conditional on the independent source research that is still in progress. No checklist approval of all names, release timing, methods, variants or camo applicability is given here. Record exact accessible source evidence and exclusions before T001 admission. The three-versus-three-more disagreement and purchased-manual independence are appropriately preserved.

The existing saveArmory transaction resolves on completion, increments revision and retains previous state. Absolute validated counter candidates, with original-revision retry rather than recalculating increments, fit that protocol; later implementation tests must still prove failed/uncertain acknowledgement, dirty/filter/leave and stale/lifecycle paths. Merely spreading entries in one handler does not certify all workbench/restore mutations; T007 must inspect every mutation owner as planned. No schema migration, public publication, merge or runtime approval is granted by this planning review.

## Artifact repair re-analysis — 2026-11-17

ACQ-01 closed at design level: data-model now sets 512KiB UTF8/depth8/25,000 nodes, explicit field lengths, final-name bound, per-record source cap, exact/plain objects, fixed categories/hosts, control-character refusal and adversarial admission tests. Source-research completion should supply the actual approved host/class sets with populated records; no inaccessible page may be treated as corroboration.

ACQ-02 closed: normalization and uniqueness apply to the final persisted owned-name key, including literal-separator collisions. T001/T002/T006 own negative cases and existing custom-name preservation. This is a validation/test contract, not an already-executed data migration or deduplication.

ACQ-03 closed: contracts/acquisition.md defines the validated focused weapon query/row destination for all resolved acquisition identities. Combat detail links require actual combat roster membership; Season1 identities get no invented stat page. T007/T008 own real navigation and archived-workbench persistence. Spec also explicitly marks melee manual/camo applicability unverified.

No remaining blocking design inconsistency found in this read-only iteration. Factual admission remains gated on the ongoing source research and exact roster/blueprint evidence; that checklist item remains unchecked. This review supports the repaired planning contracts only, not population of unverified source data, runtime implementation acceptance, publication or merge approval. Only the reviewer checklist changed.

## Source-ledger readiness review — 2026-11-17

Reviewed source-blueprints.json and revised research scope. The current ledger contains 85 rows (75 official-labelled, 10 reported-labelled) across eight groups, not the earlier 84-row message. Independently checked final normalized owned-name keys: zero duplicates; all row URLs are HTTPS without credentials; final names fit the proposed bound. Existing combat IDs resolve except the two explicitly acquisition-only Season1 slugs. This validates ledger structure/qualification, not every remote fact.

The ledger separates official Battle Pass/Vault/Prestige/promotional claims from creator-reported names/methods, labels announced-store availability unverified, dates the observation rather than inventing release dates, retains BlackCell as an editorial ownership distinction, and excludes unnamed/internal/unknown duplicate candidates and LT looted instances. FinalExfil timeout is explicitly incomplete coverage. Independently opened the official Season1 source: it supports the two new weapon names and manual entitlement from qualifying unlocks/purchases, while treating blueprint use separately; it does not establish an extraction count or verify the community camo goal. The 33-launch-plus-two release audit is researcher/parent evidence, not a new exhaustive source verification by this reviewer.

Planning source gate is closed for the documented, attributed snapshot scope. T001 must still validate final public records, weapon/source references, caps, duplicate identities and exact admitted counts before production population; no unreadable source content may be invented. No remaining blocking planning finding identified. This is implementation-plan readiness only, not runtime, final factual catalog, gameplay, public asset-license or merge approval. Only this reviewer-owned checklist changed.
