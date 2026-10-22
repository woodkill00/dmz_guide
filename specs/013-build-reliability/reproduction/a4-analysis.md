# A4: Build/save consistency investigation

Status: reproduced in a repeated-save ABA schedule; no production repair implemented. This is FR-007 / SC-004 investigation evidence, not approval of a new reader/writer contract.

## Finding first

The unchanged `scripts/build.mjs` from `db8a6e237aa822205ed346b178a3c7dc8fafea5c` can exit successfully and emit a public catalog and detail HTML that match no committed author revision. The reproducer uses three completed, valid `createAuthorStore().save()` operations, deliberately timed around the build's file reads: revision 0 → 1 → 0 → 1. The output has contentVersion 0, alpha from revision 0, and beta from revision 1.

This is **not** a reproduction of one ordinary multi-file save defeating the existing guards. A pre-existing interrupted transaction, an actual writer process exit, an active writer during the read, and one completed save during the read all caused unsuccessful builds. The original A4 hypothesis overlooked existing journal, hash and inventory guards. The reproduced gap is the absence of a non-reusable cross-process snapshot boundary across multiple completed saves.

## Scope and method

- Synthetic original two-item pack only. No game facts, private profiles, images, network access, installation, author server changes or production file edits.
- `a4-build-save.mjs` extracts the exact pinned baseline with `git archive` into a new `/tmp/dmz-a4-*` tree. Each scenario has a separate fixture, real scripts, schema and generated output. This avoids a simultaneous implementation in the working tree changing the tested source.
- `a4-preload.mjs` only pauses real `fs.promises.open` calls or completed handle closes using IPC. It does not falsify bytes, alter read order, bypass validation or modify production source. The child executes the real `scripts/build.mjs`, not a replacement build implementation.
- Existing `applyFilePlan` failpoints generate/hold interrupted transaction controls. The repeated-save reproduction uses the real public store `save` method with the latest expected revision for each save; all of its validation, version checks, transaction backups and publication paths run normally.
- No `recoverRepository` apply operation or recovery command is invoked. Pending journals, dead lock and backup bytes remain unchanged after the blocked builds. Temporary synthetic trees are retained for inspection, not automatically recovered or removed.
- Environment actually run: Linux, Node v24.19.0. Windows and Node 22 results are not claimed.

## Exact command and evidence

From the feature worktree:

```bash
SPECIFY_FEATURE_DIRECTORY=specs/013-build-reliability node specs/013-build-reliability/reproduction/a4-build-save.mjs > specs/013-build-reliability/reproduction/a4-results.json
node --test tests/runtime/catalog.test.mjs tests/runtime/author-store.test.mjs > /tmp/a4-existing-tests.txt
node --check specs/013-build-reliability/reproduction/a4-build-save.mjs
node --check specs/013-build-reliability/reproduction/a4-preload.mjs
```

All four commands exited 0. The investigation harness's exit 0 means its assertions about baseline behavior reproduced, **not** that baseline behavior is safe. `a4-results.json` preserves exact per-child stdout, stderr, exit codes, IPC gates, source hashes and fixture directory. `a4-existing-tests.txt` preserves the relevant existing suite: 38 tests, 38 pass, 0 fail, 0 skip. Both harness scripts passed syntax checks. The primary reproduction was rerun successfully while finalizing the harness.

Every actual build child is invoked as:

```text
<process.execPath> --import <absolute a4-preload.mjs> scripts/build.mjs
```

It runs in the synthetic scenario root with an IPC pipe and an explicit gate list in `A4_GATES`. Without a matching gate, the preload is transparent.

| Controlled scenario | Actual build exit | Observed outcome |
| --- | --- | --- |
| Unchanged synthetic revision 0 | 0 | Complete revision 0 catalog and detail HTML. |
| Pending journal after applied file 0 | 1 | `Repository recovery pending; run author:recover before reading or building`. Journal, full recovery tree and last-good sentinel unchanged. |
| Writer exits 29 after applied file 0 | 1 | Same pending-recovery refusal; lock is dead, journal/recovery tree and last-good sentinel unchanged. |
| Writer held after applied file 1 while build continues | 1 | `Repository changed during read; recovery or retry required`. Last-good sentinel and journal unchanged. Writer is allowed to finish its existing transaction after the build result, not recovered. |
| One completed revision 0 → 1 save during first read | 1 | `Catalog source changed during snapshot; retry`. Last-good sentinel unchanged. |
| Three completed saves 0 → 1 → 0 → 1 | 0 | Mixed revision emitted in runtime pack JSON and both detail HTML pages; no pending journal. |

Successful child stdout, verbatim:

```text
Built 18 independent HTML routes and 404 page in dist/.
```

Mixed output, verified against every committed snapshot:

```json
{
  "version": "0",
  "alpha": "SYNTHETIC alpha revision 0",
  "beta": "SYNTHETIC beta revision 1"
}
```

Committed snapshots were exclusively `{version: 0, alpha: 0, beta: 0}` or `{version: 1, alpha: 1, beta: 1}`. The output matches neither. The store permits contentVersion reuse after an intervening version: it requires a different version from the current pack, not a never-before-used generation.

## Exact ABA interleaving

1. Initial complete repository is revision 0. The build reads its manifest, header and alpha item.
2. Before the build first opens beta, save complete revision 1 using `store.save`, then resume the build. It reads beta from revision 1. There is no journal when the post-read guard runs.
3. Before the build's second manifest open (start of metadata revalidation), save complete revision 0 using `store.save`. The manifest is unchanged, while header and alpha now match the earlier bytes; their sequential rereads pass.
4. After the second alpha handle has read and closed, but before the build proceeds to beta revalidation, save complete revision 1 using `store.save`. The already captured alpha validation bytes remain revision 0; beta now matches its earlier revision 1 bytes.
5. The final inventory is unchanged and the final journal check finds none. `readCatalog` returns the mixed snapshot. The actual build generates and publishes it and exits 0.

All three saves complete before their respective build gate resumes. There is no failpoint exception, fabricated recovery journal or manual file replacement in this ABA scenario.

## Source rationale at the pinned baseline

- `scripts/build.mjs:31-44` reads catalog directly and prepares assets from that snapshot, without joining the author-store lock. `scripts/build.mjs:171-176` emits the returned catalog packs; page generation uses the same returned packs.
- `scripts/catalog.mjs:474-479` rejects an already-present journal.
- `scripts/catalog.mjs:629-655` checks the journal, individually rereads metadata/provenance hashes, rechecks inventory, then checks the journal again. These defenses correctly reject the single-save controls. They do not prove all reread bytes belong to one instant when file values can change and return between checks.
- `scripts/catalog.mjs:662` computes a hash of the collected files, not a transaction generation. Hashing the mixed collection does not establish that it was ever committed.
- `scripts/author-store.mjs:211-236` serializes cooperative readers/writers within one process. The real build runs in another process and does not join those queues.
- `scripts/author-store.mjs:238-270` provides an exclusive cross-process `.author-state/current.lock` used by writers.
- `scripts/author-store.mjs:417-450` creates a journal before publication and removes it after commit. A completed save can therefore occur entirely between read-side journal checks.
- `scripts/author-store.mjs:815-820` requires changed public content to have a different version from its immediate predecessor, so 0 → 1 → 0 → 1 is valid and was accepted by every actual `save` call.

## Minimal proposed coordination contract, not implemented

The smallest robust change is to let a build snapshot acquisition participate in the **existing cross-process repository mutex**, rather than inventing another transaction format or relying on more sequential rereads:

1. Acquire the existing mutually exclusive repository lock before catalog reads. Keep the current metadata/media validation; do not weaken it.
2. Hold that lock until catalog and referenced bundled asset bytes are fully materialized and validated. Rendering/staging can proceed from the captured data after release. Coordinate the boundary with A3's staging, but keep consistency and last-good-output preservation as separate requirements/tests.
3. An existing live, stale or unverifiable lock, or pending journal, must fail or wait only within an explicitly bounded policy. Never reclaim/recover automatically. Build failure must preserve A3's last-good output and report an honest retry/recovery instruction.
4. Reuse writer/recovery exclusion so a live build excludes saves and recovery, including when they run in another process. Release only the lock owned by that operation. A build crash leaves explicit recovery/inspection work, not silent lock theft.
5. Avoid acquiring the mutex recursively from the author store's already-locked save/read path. A bounded build-snapshot wrapper is a narrower change than silently making every `readCatalog` call lock-taking.
6. Add controlled regression checks for this exact ABA sequence, one-save/pending/dead-lock refusal, build/writer exclusion, no silent recovery, crash behavior and Linux/Windows outcomes. Do not change version semantics just to prohibit this fixture: contentVersion is user-authored content metadata, not a safe global coordination token.

An alternative is a durable, non-reusable transaction generation sampled before/after the complete snapshot, updated by every save and recovery with correct crash ordering. That is a larger persistent shared-contract change than joining the current mutex and requires its own migration/recovery design.

## Limits and disposition

This proves a deliberately scheduled repeated-save defect, not its frequency in ordinary usage, and is not a universal proof about every race. It does not claim that non-cooperative external editors can be serialized by an author-store lock. The A3 sentinel checks only show these read-stage failures happen before baseline dist deletion; they do not replace A3 write/promotion tests. Stop dependent A4 production edits until the source coordination contract and owning artifacts receive independent review. A1–A3/C12 work need not wait for a speculative broad refactor.
