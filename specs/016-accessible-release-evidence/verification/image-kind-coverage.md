# SC001 all-image-kind verification coverage

## Scope and assessment

2026-10-22; owning task T031, FR-001/FR-002, SC-001 and the plan's usage-specific image contract. Baseline: `e3dd855b6e8c948612fb430058966f0a8429969e`. This is a verification-gap repair, not a production repair or a reproduced product defect. Existing tests were left unchanged. No production code, schema, browser test or reviewer-owned checklist changed.

Independent review confirmed the required denominator is the schema's image-bearing record collections: `items`, `recipes`, `objectives`, `guides`, `maps`, and `locations`. `weapon` is an `items.kind` subtype, not a seventh collection. The new test derives the collection list from each top-level array's referenced record schema and asserts this exact inventory, so future schema additions require an explicit coverage update.

The pre-existing `tests/runtime/image-descriptions.test.mjs` covered an item and used JSON serialization for its transfer assertion. Existing browser examples are not retrospectively relabeled as per-kind matrix coverage. The new coverage below was first executed on this date against unchanged production; all cases passed on their first execution.

## Workflow and ownership

Read repository governance, the pinned `speckit-converge`, `speckit-analyze` and `speckit-implement` instructions, and the owning 016 spec, plan, tasks and supporting contracts. Ran their scoped prerequisite/checklist checks with `SPECIFY_FEATURE_DIRECTORY=specs/016-accessible-release-evidence`; it resolved to this worktree's 016 directory. No extension hooks are installed. Requirements checklist: 5 checked/0 unchecked; independent evidence-safety checklist: 7 checked/0 unchecked. Neither checklist was edited.

Scoped convergence identified one partial/HIGH verification finding: promised all-kind transfer and malformed-input coverage was incomplete. It appended Phase13/T031 without rewriting earlier tasks. Read-only scoped analysis found T031 aligned with FR-001/FR-002, SC-001, US1 transfer/legacy/decorative scenarios and the plan image contract, with no new ambiguity, contradiction or constitution conflict. Implementation is limited to that task; no broader outstanding 016 task is silently marked complete.

## New executable matrix

`tests/runtime/image-description-kinds.test.mjs` uses the canonical fictional-training fixture as a schema-valid template. Every generated record remains fictional. The two PNG payloads are an original 1x1 RGBA pixel generated from first principles, with real byte counts, SHA-256 and PNG framing. No real game descriptions, private images, remote assets or credentials are introduced.

For each of the six collections, four records reuse the same primary and additional asset IDs:

- Described: distinct text for primary and additional pictures.
- Other-description: a second record with different descriptions for those same assets, proving usage-specific rather than asset-global meaning.
- Decorative: both descriptions have empty text and `decorative: true`.
- Legacy: `imageDescriptions` is omitted, not synthesized.

Each valid fixture runs the actual shared `validatePack` boundary, then both real portable paths:

1. `exportContent` followed by `parseTransfer` for a reference-only content export.
2. `buildTransfer` followed by `parseTransfer` for a self-contained picture bundle.

Assertions compare the complete round-tripped pack, both payloads, record IDs, primary/additional attachment IDs and exact per-asset metadata; check legacy field omission; check shared resolver output for described, decorative and honest generic fallback meanings; and verify the source pack was not mutated. The picture-bundle decoder is an explicit test double that checks the exact incoming bytes and MIME and returns known fixture dimensions. Call counts prove both export and import reach it for valid fixtures. This is not evidence of actual browser decoding, rendering or a new browser run.

For each collection, eleven independent malformed variants start from a fixture that first passes shared validation:

- A known primary asset detached from the record.
- An unknown metadata asset ID.
- Duplicate metadata for an attached asset.
- Nonempty text combined with `decorative: true`.
- Whitespace-only meaningful text.
- Text exceeding the 1000-character limit.
- Numeric text.
- A string rather than Boolean decorative flag.
- An object rather than the metadata array.
- Missing required text.
- An unexpected metadata field.

Every variant must reject with the expected validation reason at five real boundaries: shared `validatePack`, `exportContent`, `buildTransfer`, reference-only `parseTransfer`, and picture-bundle `parseTransfer`. The injected decoder must remain uncalled. These assertions prove malformed metadata cannot pass those shared validation/portable acceptance boundaries; they do not impersonate an actual repository save, browser staging transaction or persistence rollback test.

## Executed evidence

Runtime environment: Node `v24.19.0`, npm `11.9.0`, Python `3.12.14`, Linux.

- Baseline `node --test tests/runtime/image-descriptions.test.mjs tests/runtime/portable.test.mjs`: 19/19 passed before adding the new matrix.
- New `node --test tests/runtime/image-description-kinds.test.mjs`: 79/79 passed, 0 failures, 0 skips. Count includes 1 inventory test, 6 positive round-trip tests, 6 negative parent tests and 66 negative subtests.
- Independent reviewer reran the new matrix: 79/79 passed and approved its source/coverage boundary.

- `npm test`: 428 total, 427 passed, 0 failed, 1 existing Windows-only skip.
- `python3 scripts/check.py`: 0 failures.
- Full repository Prettier check of `src/**/*.mjs`, `src/**/*.css`, `scripts/*.mjs`, `tests/**/*.mjs` and `package.json`: passed. Used the baseline worktree's already installed pinned Prettier 3.6.2 binary; no dependency files or software versions changed.
- `npm run build`: 154 independent HTML routes plus the 404 page.
- `python3 -m unittest discover -s tests -v`: 40/40 passed.
- `python3 scripts/package-release.py` followed by `python3 scripts/verify-release.py`: 208 fully inventoried payload files packaged, then clean extraction verified all 208 hashes, native links, owned Node child and exact content.
- `git diff --check`: passed.

Post-implementation scoped convergence rechecked T031 against the schema, test matrix and these results: the identified coverage gap is closed without a production change, so no further task was appended. Earlier tasks and reviewer criteria are unchanged. This verdict concerns T031 only, not whole-feature acceptance. Integration, exact-head hosted CI and existing browser/visual gates remain the integration owner's responsibility; this bounded coverage repair does not replace or waive them.
