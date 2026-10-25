# Independent Integration Review — 2026-10-26

Reviewer: Codex `integration_review` agent, separate from the implementation owner.

## Reviewed source and verdict

Reviewed committed candidate `fb2110960f49b74fe14a312afbfa8ad726b92ae0`, based on `808e94f1181ba161da912d48f904d4e5b874ce87`. Verdict: **the bounded additive code integration is accepted for the normal PR/CI/merge process**. No unresolved blocking code, requirements-quality, privacy or asset-exclusion finding was identified. This is not approval of unexecuted CI, future commits with application changes, public asset redistribution or deployment.

The parent repository's native `src/`, `content/`, `schemas/`, `scripts/` and root dependency lock have no diff against the base. Root package changes add only `map:*` delegation. The viewer, pinned dependencies, original synthetic tests and retained license are isolated under `tools/hajin-map`; the added CI job does not remove or relax existing checks. The public tool directory contains only `leaflet-LICENSE.txt`, not game imagery, icons or a point snapshot. Downloaded local inputs and browser evidence are ignored. No research acquisition helper or arbitrary remote writer/importer is included.

## Independent checks performed

- Read repository governance and the 019 specification, plan, research, model, contracts, tasks, analysis and acceptance receipt. The revised decision to exclude acquisition helpers narrows the input surface and does not invalidate the independent requirements-quality checklist.
- Ran `npm run map:test`: two coordinate tests and two bounded-input tests passed.
- Ran `npm run map:build`: type checking and the Vite production build passed. Confirmed the retained Leaflet license is present in the local built output after the notice repair.
- Independently ran `npm run map:test:browser` using installed Microsoft Edge through `CHROMIUM_PATH`. The final run's receipt is `2026-10-25T23:17:37.640Z`: all eleven listed behavior groups passed, with zero page errors and zero external requests. The assertions also verify full-source initial fit and marker/image alignment within two CSS pixels after zoom and mobile resize.
- Independently exercised keyboard ArrowRight pan, keyboard plus zoom and `r` reset with an additional original-raster/no-game-data local probe. All passed; the ignored probe is retained with browser evidence and is not shipped production code.
- Visually inspected the labeled synthetic desktop and mobile screenshots. The key exposes category names, counts and controls, the empty category is disabled, the source identity remains visible, and mobile close/global controls remain usable. Synthetic evidence is clearly labeled and is not real-map accuracy evidence.
- Inspected the actual retained root logs showing 40 Python tests passed, 521 Node tests passed without skips, and native browser acceptance passed. These root runs were executed by the integration owner, not rerun independently by this reviewer. Reviewed the unchanged-path diff rather than claiming unchanged Git/build identity bytes.

## Boundary and behavior assessment

The snapshot reader enforces a streamed 2 MiB cap and a 10-second abort deadline, validates source provenance, bounded category/record fields, unique IDs, counts and image-relative coordinate versions. Imported names use inert text nodes; icon paths remain restricted to the configured local directory. Raster input is restricted to raster MIME types, streamed bytes are capped at 32 MiB, and the complete fetch/decode path has a 15-second recovery deadline. Superseded requests cannot replace the current view. Source reload clears retired root/group/snapshot state before reporting loading/error, avoiding stale visible markers beside a zero-count error state.

Website roots, record/category identity and saved choices remain source-scoped. Direct and repeated Map key opening does not depend on Layers. Individual/global key selection and source controls share state, source visibility preserves its mix, and the key's explicit category choice from a hidden source reveals that category alone. The authored overlay remains separate. Browser tests exercise unavailable storage, zero-count categories, missing/malformed/oversized snapshots, image failure/retry, a hung decoder and two sources sharing record IDs.

## Finding resolved during review

The initial third-party notice incorrectly stated that the minified bundle retained the upstream Leaflet license header. The implementation owner removed that claim and added the full retained BSD license to `public/leaflet-LICENSE.txt`, which is copied to the local tool build. Verified the source and built license are present. No dependency license is represented as granting rights to game resources.

## Source fingerprints

These SHA-256 values identify the **Windows working-tree bytes** of critical files inspected and exercised in the accepted candidate, not their Git-blob bytes. Some working-tree files use CRLF while Git normalizes committed text to LF; other listed files already use LF. Independently verified that CRLF-to-LF normalization of each of the seven listed working-tree files is byte-for-byte equal to `git show fb2110960f49b74fe14a312afbfa8ad726b92ae0:<path>`. For example, `src/main.ts` has working-tree SHA-256 `a1b5f2fc5f3ebaaf613020e012d92671677bbb02fd693dee6146ebbb0d0e9930`, while that commit's corresponding Git blob has SHA-256 `d4692caa92ee5ae8db422ba92dea2157e3f50086f28ef48de930956c66ae971a`.

| File | Windows working-tree byte SHA-256 |
| --- | --- |
| `tools/hajin-map/src/main.ts` | `a1b5f2fc5f3ebaaf613020e012d92671677bbb02fd693dee6146ebbb0d0e9930` |
| `tools/hajin-map/src/map/source-markers.ts` | `8bfd26f1f8067f8504ce2b61950858e0860016891ac743f649bb32a4dfc58ad2` |
| `tools/hajin-map/src/map/map-view.ts` | `923434e1c4e17fd527c236c8da3d3b8b66e4a3b0bd06d040d122c730c8004a86` |
| `tools/hajin-map/src/map/bounded-input.ts` | `a37e059e12c9fb87ea776a31d8105ce2a2dd0926805406a70d63ec7fabaca6ed` |
| `tools/hajin-map/scripts/test-workspace.cjs` | `7b40d2acfcba20e1dee297cc63b36ba4c73c9f7e333fa360a8c2a19dbcd75139` |
| `tools/hajin-map/package-lock.json` | `a0169dde1bee2408097d8d4d17c1478153686d4889e8731329233f0ce2ffd714` |
| `tools/hajin-map/public/leaflet-LICENSE.txt` | `53e8dc25862014e4324741ca18fbe3611e11d42ef69f59f86ea8c5389647d4cb` |

## Limits and remaining gates

Reviewed on Windows/Node 24 with installed Edge. Actual Node 22, hosted OS/engine CI, physical touch devices, formal accessibility certification, game facts/asset rights, final merged-main identity and future deployment are not established by this review. Keep failed-history qualifications in acceptance.md. A documentation-only review/evidence receipt may follow this candidate without changing the accepted application source; application or test-source changes require review of their delta and appropriate reruns. Normal PR checks and main verification remain the integration owner's responsibility.
