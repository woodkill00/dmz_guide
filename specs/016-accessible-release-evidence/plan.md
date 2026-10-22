# Implementation Plan: Accessible pictures and release evidence

**Branch**: `016-accessible-release-evidence` | **Date**: 2026-10-22
**Spec**: [spec.md](spec.md)
**SPECIFY_FEATURE_DIRECTORY**: `specs/016-accessible-release-evidence`

## Summary
Implement Wave3/13–14 only: usage-specific image semantics, read-only retained recovery inventory, complete release evidence. Wave4 reproducibility is excluded until separate gates.

## Technical Context
Node22/24 ESM, static HTML, schema-driven editor, local JSON/media, Python3 ZIP packaging. No new dependency or credential. Baseline exact013 b54b2312e27a008b75bad04ab7f342ae4ef68ba6 (original inspected6d92043). Existing staged build and serialized catalog snapshot remain unchanged.

## Constitution Check
All ten principles preserved. Accessibility without invented meaning; bounded inert imports; no new source of truth; private/repository boundary unchanged; independent checklist before code; actual evidence before completion. Constitution reviewed without amendment. Post-design check: no exceptions.

## Structure and ownership
- Own schemas/pack.schema.json, src/content/validate.mjs, new src/content/image-description.mjs, src/client/studio-media.mjs, minimal generic private editor support if schema insufficient.
- Renderer owner014 applies exact helper call patch; Studio markup owner015 adds picture-description and picture-decorative controls. No conflicting edits.
- Own read-only exported inspectRecoveryStorage in scripts/author-store.mjs, package-release.py/verify-release.py and focused tests. No promotion/mutex/staging semantic edits.
- Source/build identity helper and minimal staged-generation identity output need integrator final approval before code. Hash actual source files available to build snapshot, not a later guessed Git SHA. Git metadata is descriptive and dirty/unknown is explicit.
- New specs/016, targeted runtime/browser tests, docs/content image contract notes only; no broad extraction or manifest-boundary consolidation.

## Phase0 research and reproduction
Source confirms generic renderer rights-cleared alt and no per-usage semantics; schemas reject new metadata. Source confirms manifest hashes only dist, leaving launcher/docs/start instructions uncovered; verifier iterates listed entries without checking exact member set. Recovery currently retains transactions but has no byte/count/eligibility report. Add focused failing fixtures before changing production. Capture exact commands/results in acceptance.md. This feature does not assert an observed data-loss incident.

## Phase1 contract decisions
Use optional bounded array imageDescriptions (not map) because generic schema editor already supports bounded arrays. Each item {assetId,text,decorative}, max9 unique attached IDs; metadata may be omitted for legacy. Decorative requires empty text; meaningful descriptions require trimmed nonempty <=1000. Schema-driven guided editors provide existing-record editing; attachment controls set same metadata and cleanup stale attachment descriptions. Imports/recovery validate using same schema/semantic boundary.
Resolver receives spoiler-safe display record; returns empty for decorative, explicit description when present, generic public record title plus picture when legacy. All output escaped at renderer; captions remain rights only.
Recovery inventory counts actual regular retained transaction files, bounded directory/file scans and aggregate reads; no mkdir, recover, writes, delete or Git invocation. Pending/lock/unknown/incomplete scan makes eligibility false. Verify committed receipts against before/after backup bytes and expected path sets; no-follow symlinks. Historical receipt retention is necessary for deleted-path tracking, so eligibility is archival review only, not deletion safety.
Manifest format version2 includes file hashes+sizes for every payload, exact sorted archive member names including manifest itself, explicit manifest-self-digest exclusion and source/schema/build evidence. Verify member set, duplicates, safe paths, regular types and all payload hashes before extraction/execution. Identity provenance is tied to build-time output; manifest consistency cannot authenticate hostile replacement of both manifest and payload.

## Verification
Node runtime focused tests then npm test; python3 scripts/check.py; npm run build; package/verify; npm run format:check. Existing hosted quality.yml Windows/Linux bounded Node matrix and Chromium, Firefox/WebKit, Studio, full-page tiling and actual200% remain unchanged. Local sandbox browser unavailable is reported, not bypassed. Independent custom checklist, analyze, implement, converge, source/visual review and exact-head/main gates required.

## Concrete bounded inspection contract
Recovery inventory scans at most1000 transaction folders, 50000 files total, depth3 below transactions, 128MiB aggregate verified bytes, 8MiB per receipt, 64MiB per retained backup, with bounded directory iteration (not unbounded readdir). It counts encountered regular files via stat without following symlinks. Any unsupported file/name/type, unreadable path, limit hit or changed stat/list/journal/lock makes complete=false and all archival eligibility false; totals are explicitly partial. Compare journal/lock bytes and file identity/size/mtime before/after scan; any live or unknown lock blocks eligibility. No filesystem can supply a universal atomic snapshot against hostile concurrent writers; eligibility is point-in-time manual review only.
Archive verification limits: 50000 entries, 512MiB total uncompressed bytes, 64MiB single file, 16MiB manifest; reject encrypted entries, directories, symlinks/nonregular mode, absolute/drive/backslash/NUL/dot/dotdot names, empty components and case-folded name collisions before extraction. Exact inventory includes manifest name but excludes its hash. Match declared sizes and sha256 for all payloads before any execution.
