# Acceptance — weapon database and patch checks

2026-11-01, local-only feature048. Independent definition/source/visual review passed; functional verification is complete. Final independent review passed for local delivery; clean local delivery passed as recorded below. No public redistribution/deployment is claimed.

## Populated and exercised

- 33 official launch weapon identities/basic observations in the native catalog; existing M4/Han86/Axion/Kastov762 IDs retained. Original unrelated records and private-state formats remain.
- 615 standard +28 Apex attachments;972 standard +19 Apex nonempty effect pairs =991. Missing effects remain unknown. Source-linked community numbers retain their Multiplayer/uncertain-mode labels; official launch sheet remains dated. Publisher BPM and conflicting MP unlock reports are preserved.
- 65 official numeric change reports imported from the rolling launch patch page, all October28 Multiplayer. Live supervised fetch/check succeeded; explicit apply added65. A fresh check returned0added/0changed/65unchanged, and repeat apply was a byte-identical no-op. Qualitative known-weapon text is represented by dated mode/source review pointers, not invented numerical changes. Historical beta exclusion is explicit.
- 829-route build passed. All66 weapon armory/native detail routes and the update-instructions route returned HTTP200. Guide/Studio/map/help previews now include both new navigation destinations; owned Studio restart occurred only after pending=false/lock=null, no repository recovery pending.

## Verification receipts

- 27 Python tests passed with no skips (`.local/weapon048-python-limits-final.log`): actual imported references/counts; byte-identical repeat; changed report history; stale/CAS and owner edit during backup; lock/backup/replace failures; source/identity/field/depth limits; mode/date/unknown-scope parser cases; partial weapon/Apex names; qualitative pointers; discovery bounds; failed fetch and supervised hard-timeout behavior.
- 5 final focused Node tests passed (`.local/weapon048-node-frozen.log`): native/sidecar coverage, scope/units/unknowns, strict validation, HTML escaping, native links and exact variant rules.
- Full runtime convergence run706/706 passed, zero failure/skip/cancel,189425.2446ms (`.local/weapon048-runtime2.log`). A later frozen run overlapped the accessibility scan and hit a legacy build fixture's existing30-second child deadline; retained receipt `.local/weapon048-runtime-frozen.log`. The final exclusive frozen-code run passed706/706, zero failed/skipped/cancelled,196131.3163ms (`.local/weapon048-runtime-exclusive.log`), with every original deadline retained. No deadline is relaxed.
- Chromium, Firefox and WebKit each passed48 responsive/theme/actual200%text cases plus real filters, native links, source context, keyboard regions and no-JS navigation. Existing navigation-directory journeys passed in each engine with strict browser health and CSP enforcement (`.local/weapon048-browsers-final.log`).
- Actual desktop/mobile Han86 screenshots independently viewed: launch/community/patch scope, dates and uncertainty remain readable. Retained images: `test-results/armory-desktop.png`, `armory-mobile.png`.
- First64 accessibility scans found0 violations, but strict health caught axe's own inline-style probes under CSP. The same64 scans then passed with0violations and strict health in an accessibility-only bypassCSP context (`.local/weapon048-axe-final.log`). The normal three-browser app journeys retain CSP/strict health; application policy is unchanged.
- Formatting, repository check and whitespace validation passed before final documentation completion. All frontend, Node and catalog inputs match `.local/weapon048-tested-identity.json`. The only subsequent production change is Python updater validation alignment (total-node budget, strict dates/version type), revalidated by27Python tests and another live zero-change check. `.local/weapon048-final-tested-sources.json` records the resulting tested source map. Clean commit/build/source equivalence and final smoke passed.

## Repairs retained in the record

The initial full runtime had696/705 passing: isolated build fixtures lacked the newly required intelligence input, and native records rewritten with Windows CRLF did not equal canonical Studio bytes. Fixtures now copy the required input and records use catalogJSON; all original lock/snapshot/canonical assertions remain. Initial importer caught an unsupported heading and publisher custom-unit mismatch before a successful build.

Independent review reproduced MP mode leaking into an unknown sibling section, a fake weapon-prefix match, an arbitrary Apex suffix match, inconsistent collection types and a missing hard DNS/header deadline. Repairs reset mode context by heading hierarchy, require exact identities/known variants, align validators/history hashes and supervise cancellable fetch subprocesses. Regression tests preserve the reproductions. No incompatible source becomes a DMZ number.

The initial table allowed sticky content to widen document scroll; layout/paint containment fixes it while local horizontal scrolling remains. WebKit exposed an early-input/enhancement race; setup now reads existing input and tests observe actual readiness, with original filter results asserted.

## Limits

This is a source-backed launch snapshot and official change ledger, not a complete verified current-DMZ damage/armor/TTK or loadout simulator. Qualitative/unknown layouts and new unsupported weapon variants need human review/parser maintenance. An edited local proposal is not authenticated publisher evidence. Updates are explicit CLI actions with review/apply/rebuild; no browser-write server, unattended scheduler or automatic MP-to-DMZ baseline overwrite was added. Physical-device/screen-reader certification is not claimed. Source/backup/proposal privacy and attribution remain documented.


Final source refinement: Python read/apply now shares the runtime reader's150000-value/depth20 budget and rejects malformed literal versions/dates. No frontend, native catalog or Node source changed after their browser/runtime evidence. Final local source comparison explicitly verifies that scoped delta rather than claiming it did not happen.


Independent final verdict: PASS, integration_review,2026-11-01; reviewer-owned checklist records repaired reproductions, actual visual/data audit and all final receipts. Map typecheck/production build passed with its existing chunk-size advisory (`.local/weapon048-map-build.log`). Clean local commit, source-equivalent guide rebuild and final smoke passed.


## Local delivery complete

Clean feature commit built829 HTML routes plus404; shared map typecheck/build passed. Generated identity reports clean Git state and exact commit revision, with105 source-input hashes equal to the final tested source map and795 captured catalog-file hashes equal to browser-tested inputs (`.local/weapon048-source-equivalence.log`). Frontend/native inputs did not change after browser/visual evidence; the documented Python-only validation refinement received scoped27-test/live-check verification.

The final bundled-Chromium smoke passed Guide/Studio/map/help HTTP200, all three menu groups, the correct Weapon updates destination, enhancement/Escape/focus and strict health (`.local/weapon048-smoke.log`). All66 weapon detail/catalog routes and the update route were checked separately. Guide remains at http://127.0.0.1:4173/armory/; instructions at /armory/updates/. Studio4174 and map5175 remain running. No remote write or publication occurred.

Final documentation-only completion is committed and the clean amended revision is rebuilt/source-compared again. Formatting/repository validation and whitespace checks pass. T001-T007 complete.
