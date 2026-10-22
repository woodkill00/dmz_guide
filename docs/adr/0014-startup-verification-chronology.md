# ADR 14: Bounded startup verification chronology exception

Date: 2026-10-22. Status: accepted process exception for the already-performed 015 startup work, independently reviewed and approved before publication. This does not ratify unrelated recommended architecture decisions.

## Context and affected obligations

Feature 015 requires actionable missing-build and occupied-port startup diagnostics without changing origin: FR-002, SC-004 and US3/AC2, implemented through the startup portions of T009–T010. Its plan calls for failure-first reproduction, and the constitution requires exceptions to have an explicit decision and revisit trigger.

The startup implementation preceded the independently retained missing-build baseline replay. The later replay used unchanged baseline `b54b2312e27a008b75bad04ab7f342ae4ef68ba6`: with no reader build, the original server remained running beyond two seconds and printed a startup URL. The probe terminated only its owned child. This establishes the missing-build finding retrospectively; it cannot establish red-before-implementation chronology.

Earlier 013 occupied-port readiness evidence records the unchanged server exiting with code 1 and `EADDRINUSE`. Its recorded source SHA-256, `69fd9d754fa2d3276ae0899b54d0c455201860c5da0958e97054c6e90b9c7bd1`, matches the baseline server above (Git blob `0fd4d640392cee4dfa261f42c8cb70253903479e`). That experiment investigated the verifier accepting an unrelated HTTP response despite its child failing; the server's occupied-port refusal was already valid. It used the historical fixed-port/maps fixture and retained summarized error evidence, not a standalone ephemeral-port probe or complete original diagnostic text. It does not prove a separate 015 friendly-diagnostic failure-first sequence. No duplicate experiment or new historical timing claim is made here.

## Decision

Accept this one disclosed ordering deviation after independent unchanged-baseline review and the unchanged candidate startup assertions, without relabelling it failure-first. Current candidate tests exercise actual missing-build and occupied-port process exits, actionable messages and no automatic port change. Source, full platform/browser checks, normal guarded merge and exact-main verification remain required; the exception does not substitute for those gates.

The independently accepted 015 candidate is `86c2572b92b2fb5a32c94d8fd1b5cb87303fb95d`, with all six jobs successful in [run 39784262513](https://github.com/woodkill00/dmz_guide/actions/runs/39784262513). Its original main run exposed separate readiness-fixture bootstrap assumptions; it is not relabelled green. The reviewed maintenance was merged as `db8951d871eeb841735166eb37316e9650305aa4`, and all six jobs in [exact-main run 39809260497](https://github.com/woodkill00/dmz_guide/actions/runs/39809260497) succeeded. The remaining all-wave closeout is a separate gate.

This is a process-only record. It waives no security, data-loss, rights, factual-integrity, process-ownership or assertion requirement, grants no permission to implement future changes before reproduction, and changes no runtime behavior, data format, credentials, settings or migration policy. There is no data migration.

## Expiry and revisit trigger

The exception applies only to the already-performed 015 startup implementation and cannot authorize another occurrence. Revisit it before the next startup-behavior change or immediately if contradictory baseline evidence appears, whichever happens first. Future work must establish the intended failing behavior before repair and retain the applicable independent review and release gates. Expiry does not erase this historical record.

## Evidence

- [015 owning acceptance and explicit chronology](../../specs/015-contributor-workflows/acceptance.md)
- [Earlier 013 readiness experiment results](../../specs/013-build-reliability/reproduction/readiness-results.jsonl)
- [Current startup contract tests](../../tests/runtime/contributor-workflows.test.mjs)
